import { AppError } from '../errors/app-error.js';
import { validateEmployeeInput } from '../models/employee.model.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

export function createEmployeeService({ employeeRepository, now = () => new Date() }) {
  return {
    listEmployees(workspaceId) {
      return employeeRepository.listEmployees(workspaceId);
    },

    createEmployee(workspaceId, input) {
      return employeeRepository.createEmployee(workspaceId, validateEmployeeInput(input));
    },

    async updateEmployee(workspaceId, employeeId, input) {
      const current = await employeeRepository.getEmployee(workspaceId, employeeId);
      if (!current) throw notFound();
      const updated = await employeeRepository.updateEmployee(
        workspaceId,
        employeeId,
        validateEmployeeInput({ ...current, ...input }),
        now(),
      );
      if (!updated) throw notFound();
      return updated;
    },
  };
}
