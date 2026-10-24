import { AppError } from '../errors/app-error.js';
import {
  validateDirectWorkOrderInput,
  validateScheduleInput,
  validateWorkOrderPriority,
  validateWorkOrderStatusChange,
} from '../models/work-order.model.js';
import { workspaceLocalTimeToUtc } from '../models/work-order-schedule.model.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

function formatPropertyAddress(property) {
  return [property.addressLine1, property.addressLine2, `${property.city}, ${property.state} ${property.postalCode}`, property.country]
    .filter(Boolean)
    .join(', ');
}

function conflictFromRepository(error) {
  if (error === 'NOT_FOUND') return notFound();
  if (error === 'NOT_ACCEPTED') {
    return new AppError('ESTIMATE_NOT_ACCEPTED', 'Only an accepted estimate can become a work order.', 409);
  }
  if (error === 'ALREADY_CONVERTED') {
    return new AppError('ESTIMATE_ALREADY_CONVERTED', 'This estimate already has a work order.', 409);
  }
  if (error === 'CONFLICT') return new AppError('WORK_ORDER_STATUS_CONFLICT', 'The work order changed; reload and try again.', 409);
  if (error === 'LOCKED') return new AppError('WORK_ORDER_LOCKED', 'Completed or canceled work orders cannot be rescheduled.', 409);
  return null;
}

export function createWorkOrderService({ workOrderRepository, estimateRepository, crmRepository, now = () => new Date() }) {
  return {
    listWorkOrders(workspaceId) {
      return workOrderRepository.listWorkOrders(workspaceId);
    },

    async createDirectWorkOrder({ workspaceId, actorUserId, input }) {
      const data = validateDirectWorkOrderInput(input);
      const [property, customer, propertyManager, serviceRequest] = await Promise.all([
        crmRepository.getProperty(workspaceId, data.propertyId),
        data.customerId ? crmRepository.getCustomer(workspaceId, data.customerId) : null,
        data.propertyManagerId ? crmRepository.getPropertyManager(workspaceId, data.propertyManagerId) : null,
        data.serviceRequestId ? estimateRepository.getServiceRequest(workspaceId, data.serviceRequestId) : null,
      ]);
      if (!property || (data.customerId && !customer) || (data.propertyManagerId && !propertyManager)
        || (data.serviceRequestId && !serviceRequest)) throw notFound();
      if (serviceRequest?.propertyId && serviceRequest.propertyId !== property.id) {
        throw new AppError('REQUEST_PROPERTY_MISMATCH', 'Work order property must match the linked request property.', 400);
      }

      const recipient = customer ?? propertyManager;
      return workOrderRepository.createDirectWorkOrder({
        workspaceId,
        actorUserId,
        data,
        snapshots: {
          billToName: recipient.companyName || recipient.name,
          billToEmail: recipient.email,
          billToPhone: recipient.phone,
          propertyAddress: formatPropertyAddress(property),
        },
      });
    },

    async createFromAcceptedEstimate({ workspaceId, estimateId, actorUserId }) {
      const estimate = await estimateRepository.getEstimate(workspaceId, estimateId);
      if (!estimate) throw notFound();
      if (estimate.status !== 'ACCEPTED') {
        throw new AppError('ESTIMATE_NOT_ACCEPTED', 'Only an accepted estimate can become a work order.', 409);
      }
      const result = await workOrderRepository.createFromAcceptedEstimate({ workspaceId, estimateId, actorUserId });
      if (result?.error) throw conflictFromRepository(result.error);
      return result.data;
    },

    async updateStatus({ workspaceId, workOrderId, actorUserId, status, reason }) {
      const current = await workOrderRepository.getWorkOrder(workspaceId, workOrderId);
      if (!current) throw notFound();
      if (status === 'SCHEDULED') {
        throw new AppError('WORK_ORDER_SCHEDULE_REQUIRED', 'Set a date and estimated duration to schedule this work order.', 409);
      }
      const normalizedReason = validateWorkOrderStatusChange({
        currentStatus: current.status,
        nextStatus: status,
        reason,
      });
      const result = await workOrderRepository.updateStatus({
        workspaceId,
        workOrderId,
        actorUserId,
        status,
        reason: normalizedReason,
        occurredAt: now(),
      });
      if (result?.error) throw conflictFromRepository(result.error);
      return result.data;
    },

    async updateSchedule({ workspaceId, workOrderId, actorUserId, input }) {
      const valid = validateScheduleInput(input);
      const [workOrder, workspace] = await Promise.all([
        workOrderRepository.getWorkOrder(workspaceId, workOrderId),
        workOrderRepository.getWorkspaceTimeZone(workspaceId),
      ]);
      if (!workOrder || !workspace) throw notFound();
      const startAt = workspaceLocalTimeToUtc(valid.startAtLocal, workspace.timeZone);
      const endAt = new Date(startAt.getTime() + valid.durationMinutes * 60_000);
      const result = await workOrderRepository.updateSchedule({
        workspaceId,
        workOrderId,
        actorUserId,
        startAt,
        endAt,
        durationMinutes: valid.durationMinutes,
        reason: valid.reason,
        occurredAt: now(),
      });
      if (result?.error) throw conflictFromRepository(result.error);
      return { ...result.data, scheduleConflicts: result.conflicts };
    },

    async updatePriority({ workspaceId, workOrderId, actorUserId, priority }) {
      const nextPriority = validateWorkOrderPriority(priority);
      const result = await workOrderRepository.updatePriority({
        workspaceId,
        workOrderId,
        actorUserId,
        priority: nextPriority,
        occurredAt: now(),
      });
      if (result?.error) throw conflictFromRepository(result.error);
      return result.data;
    },
  };
}
