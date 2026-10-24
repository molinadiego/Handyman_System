import { AppError } from '../errors/app-error.js';
import {
  validateMaterialLineInput,
  validateVoidReason,
  validateWorkLogInput,
  validateWorkOrderAdjustmentInput,
} from '../models/work-order-actual.model.js';
import { workspaceLocalTimeToUtc } from '../models/work-order-schedule.model.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

export function createWorkOrderActualsService({ actualsRepository, workOrderRepository, employeeRepository, now = () => new Date() }) {
  return {
    async listActuals(workspaceId, workOrderId) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      return actualsRepository.listActuals(workspaceId, workOrderId);
    },

    async createWorkLog({ workspaceId, workOrderId, actorUserId, input }) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      const data = validateWorkLogInput(input);
      const workspace = await workOrderRepository.getWorkspaceTimeZone(workspaceId);
      if (!workspace) throw notFound();
      const startedAt = workspaceLocalTimeToUtc(data.startedAtLocal, workspace.timeZone);
      const endedAt = workspaceLocalTimeToUtc(data.endedAtLocal, workspace.timeZone);
      if (endedAt <= startedAt) {
        throw new AppError('INVALID_WORK_LOG_RANGE', 'Work log end must be after its start.', 400);
      }
      const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000);
      return actualsRepository.createWorkLog({
        workspaceId,
        workOrderId,
        createdByUserId: actorUserId,
        startedAt,
        endedAt,
        durationMinutes,
        note: data.note,
      });
    },

    async voidWorkLog({ workspaceId, workOrderId, workLogId, actorUserId, reason }) {
      const normalizedReason = validateVoidReason(reason);
      const result = await actualsRepository.voidWorkLog({
        workspaceId,
        workOrderId,
        workLogId,
        actorUserId,
        reason: normalizedReason,
        occurredAt: now(),
      });
      if (!result) throw notFound();
      return result;
    },

    async createMaterialLine({ workspaceId, workOrderId, actorUserId, input }) {
      const workOrder = await workOrderRepository.getWorkOrder(workspaceId, workOrderId);
      if (!workOrder) throw notFound();
      const data = validateMaterialLineInput(input);
      if (data.customerCharge != null && workOrder.pricingType !== 'TIME_AND_MATERIALS') {
        throw new AppError('MATERIAL_CHARGE_NOT_ALLOWED', 'Materials on fixed-price orders are recorded as costs; use an explicit adjustment for authorized scope/price changes.', 409);
      }
      if (data.payerEmployeeId && !(await employeeRepository.getEmployee(workspaceId, data.payerEmployeeId))) throw notFound();
      return actualsRepository.createMaterialLine({ workspaceId, workOrderId, recordedByUserId: actorUserId, data });
    },

    async voidMaterialLine({ workspaceId, workOrderId, materialLineId, actorUserId, reason }) {
      const normalizedReason = validateVoidReason(reason);
      const result = await actualsRepository.voidMaterialLine({
        workspaceId,
        workOrderId,
        materialLineId,
        actorUserId,
        reason: normalizedReason,
        occurredAt: now(),
      });
      if (!result) throw notFound();
      return result;
    },

    async createAdjustment({ workspaceId, workOrderId, actorUserId, input }) {
      const workOrder = await workOrderRepository.getWorkOrder(workspaceId, workOrderId);
      if (!workOrder) throw notFound();
      const data = validateWorkOrderAdjustmentInput(input);
      if (data.type === 'TIME_AND_MATERIALS_CHARGE' && workOrder.pricingType !== 'TIME_AND_MATERIALS') {
        throw new AppError('ADJUSTMENT_PRICING_TYPE_MISMATCH', 'Time-and-materials charges can only be added to time-and-materials work orders.', 409);
      }
      const result = await actualsRepository.createAdjustment({
        workspaceId,
        workOrderId,
        createdByUserId: actorUserId,
        data,
        occurredAt: now(),
      });
      if (!result) throw notFound();
      return result;
    },
  };
}
