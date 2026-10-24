export function createEmployeeController({ employeeService }) {
  return {
    list: async (request, response) => {
      const data = await employeeService.listEmployees(request.workspace.id);
      response.status(200).json({ data });
    },
    create: async (request, response) => {
      const data = await employeeService.createEmployee(request.workspace.id, request.body ?? {});
      response.status(201).json({ data });
    },
    update: async (request, response) => {
      const data = await employeeService.updateEmployee(
        request.workspace.id,
        request.params.employeeId,
        request.body ?? {},
      );
      response.status(200).json({ data });
    },
  };
}
