import React, { useEffect, useRef, useState } from 'react';
import { EstimateAcceptancePage, EstimatesPage, ServiceRequestsPage } from './RequestEstimatePages.jsx';
import { EmployeePage } from './EmployeePage.jsx';
import { AssignedWorkOrderPage } from './AssignedWorkOrderPage.jsx';
import { WorkOrdersPage } from './WorkOrderPage.jsx';
import { AppointmentResponsePage } from './AppointmentResponsePage.jsx';

const copy = {
  en: {
    eyebrow: 'Your business, in good order',
    title: 'Less juggling. More hands-on work.',
    description: 'A clear home for your customers, jobs, schedule, estimates and payments.',
    status: 'Project foundation',
    ready: 'Ready to build',
    language: 'Español',
    next: 'The workspace for your day-to-day work is taking shape.',
    footer: 'Built for the work that keeps things working.',
    signIn: 'Sign in',
    createAccount: 'Create account',
    registerTitle: 'Create your owner account',
    loginTitle: 'Welcome back',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    register: 'Register',
    login: 'Sign in',
    forgotPassword: 'Forgot password?',
    sendReset: 'Send reset link',
    updatePassword: 'Update password',
    verifyTitle: 'Verify your email',
    verifying: 'Verifying your email…',
    verified: 'Your email is verified. You can sign in now.',
    resetTitle: 'Reset your password',
    workspaceTitle: 'Your workspaces',
    settings: 'Settings',
    languageSetting: 'Interface language',
    saveSettings: 'Save settings',
    saving: 'Saving…',
    settingsSaved: 'Language preference saved.',
    languageSaveFailed: 'Could not save the language preference.',
    english: 'English',
    spanish: 'Spanish',
    openWorkspace: 'Open workspace',
    backToWorkspaces: 'Back to workspaces',
    workspaceDetail: 'Workspace is ready. Customer and property management is the next module.',
    customers: 'Customers',
    propertyManagers: 'Property managers',
    properties: 'Properties',
    requests: 'Service requests',
    estimates: 'Estimates',
    workOrders: 'Work orders',
    employees: 'Employees and helpers',
    calendarView: 'Calendar view',
    listView: 'List view',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    noScheduledWork: 'No scheduled work',
    calendarConflictScope: 'Conflict warnings compare orders sharing an assigned owner or employee.',
    workActuals: 'Time, materials and adjustments',
    actualsAccountingNotice: 'These are operating records, not accounting reports. Time and material costs do not automatically change the agreed work order total.',
    additionalAuthorizationNotice: 'These adjustments do not approve additional work. Record verifiable customer authorization separately before performing extra scope.',
    additionalWork: 'Additional work authorization',
    additionalWorkTitle: 'Additional-work title',
    additionalWorkReason: 'Why is this additional work needed?',
    additionalWorkDescription: 'Additional scope description',
    estimatedAmount: 'Estimated amount (USD)',
    approvedAmount: 'Customer-authorized amount (USD)',
    requestAuthorization: 'Record request for authorization',
    authorizationMethod: 'How did the customer authorize it?',
    inPersonAuthorization: 'In person',
    phoneAuthorization: 'By phone',
    authorizedByName: 'Name of person who authorized',
    authorizationDetails: 'Verifiable authorization details',
    confirmCustomerAuthorization: 'I verified the customer explicitly approved this work and amount.',
    confirmCustomerAuthorizationRequired: 'Explicit, verified customer approval is required; silence is not approval.',
    recordApproval: 'Record customer approval',
    rejectAdditionalWork: 'Record customer rejection',
    cancelAdditionalWork: 'Cancel request',
    additionalDecisionReasonPrompt: 'Enter why the additional-work request was rejected or canceled:',
    authorizationRecorded: 'Authorization recorded',
    authorizationHistory: 'Authorization history',
    additionalWorkAlreadyDecided: 'This additional-work request is no longer pending.',
    additionalWorkConflict: 'This request changed; reload the work order and try again.',
    additionalWorkPENDING_AUTHORIZATION: 'Pending authorization',
    additionalWorkAPPROVED: 'Approved',
    additionalWorkREJECTED: 'Rejected',
    additionalWorkCANCELED: 'Canceled',
    appointmentContact: 'Appointment contact',
    contactType: 'Contact type',
    contactTenant: 'Tenant / access contact',
    contactCustomer: 'Customer contact',
    contactOther: 'Other contact',
    saveAppointmentContact: 'Save appointment contact',
    sendAppointmentOptions: 'Email appointment options',
    appointmentLinkSent: 'Appointment options email sent.',
    appointmentLinkFailed: 'Appointment link email failed. Check the contact email and resend.',
    appointmentContactRequired: 'A valid appointment contact email is required. For a managed property, add the tenant/access contact; do not send to the property manager by default.',
    appointmentNotScheduled: 'Schedule the work order before emailing appointment options.',
    appointmentLinkInvalid: 'This appointment link is invalid, expired, or no longer current.',
    appointmentResponseTitle: 'Appointment response',
    loadingAppointment: 'Loading appointment…',
    scheduledFor: 'Scheduled for',
    appointmentTimeZone: 'Times are shown in',
    appointmentResponse: 'Your response',
    confirmAppointment: 'Confirm appointment',
    requestReschedule: 'Request a different time',
    requestCancellation: 'Request cancellation',
    proposedAppointmentTime: 'Requested date and time',
    requestReason: 'Reason for the request',
    scheduleChangePendingNotice: 'A request does not change the schedule. The business owner must review it.',
    submitAppointmentResponse: 'Submit response',
    appointmentConfirmed: 'Appointment confirmation recorded.',
    appointmentRequestPending: 'Your request was sent to the business owner and is pending review.',
    scheduleChangePending: 'Pending owner decision',
    scheduleChangeConfirmed: 'Confirmed',
    scheduleChangeApproved: 'Approved',
    scheduleChangeRejected: 'Rejected',
    approveScheduleRequest: 'Approve request',
    rejectScheduleRequest: 'Reject request',
    rejectScheduleReasonPrompt: 'Enter a reason for rejecting this request:',
    scheduleRequestApproved: 'Request approved; the work order schedule was updated.',
    scheduleRequestRejected: 'Request rejected; the existing schedule remains unchanged.',
    scheduleRequestConflict: 'Request approved with {count} conflict(s):',
    offlinePrepareButton: 'Prepare this order for offline use',
    offlinePrepared: 'Order encrypted and prepared for offline use. Re-enter the access code to unlock it on this device.',
    offlinePrepareFailed: 'Could not prepare the encrypted offline order.',
    offlineMustPrepare: 'Prepare this order while online before using it offline.',
    offlineQueueFull: 'Sync the queued updates before adding more offline events.',
    offlineRevocationNotice: 'Offline access cannot receive a revocation or cancellation until this device reconnects. Only this prepared order is available.',
    offlineProgressQueued: 'Progress was encrypted and queued. It will sync when this device reconnects.',
    offlineCompletionQueued: 'Completion is queued. The server will revoke access when it syncs; a disconnected device cannot receive revocation yet.',
    offlineSyncFailed: 'Offline updates remain encrypted on this device and will retry when connected.',
    offlineDataCleared: 'Updates synced and offline order data cleared because access is no longer active.',
    offlineConflictsSent: '{count} offline event(s) need owner review; both histories were preserved.',
    offlineSyncComplete: 'Offline updates synced.',
    offlineLockboxNotPrepared: 'This lockbox was not included when the order was prepared online.',
    offlineLockboxAuditQueued: 'Offline lockbox access was recorded locally and will sync later.',
    offlineRevocationWarning: 'This device may remain offline. Cancellation or access revocation cannot reach it until it reconnects. Continue?',
    employeeEmailChangeRevokes: 'Changing this email revokes current order codes. The owner must resend a new code to the new address.',
    offlineReviewTitle: 'Offline activity requiring review',
    offlineReviewNotice: 'Both the device event and current order history are preserved. Choose explicitly how to resolve each conflict.',
    offlineProgressEvent: 'Offline progress event',
    offlineLockboxEvent: 'Offline lockbox access',
    deviceTime: 'Device time',
    receivedTime: 'Received',
    conflictReason: 'Conflict',
    applyOfflineEvent: 'Apply event',
    dismissOfflineEvent: 'Dismiss event',
    acknowledgeOfflineAccess: 'Acknowledge access',
    offlineResolutionReasonPrompt: 'Enter why you are resolving this offline event:',
    offlineEventResolved: 'This offline event has already been resolved.',
    offlineTerminalOrder: 'A terminal work order cannot be reopened from an offline event.',
    offlineEventConflict: 'The work order changed; reload and review the conflict again.',
    orderFiles: 'Work order files',
    mediaPrivacyNotice: 'Files are private to this workspace and order; access is checked on every upload and download.',
    addPhotos: 'Add photos',
    addVideos: 'Add videos',
    uploadingMedia: 'Compressing and uploading…',
    mediaUploaded: 'File uploaded.',
    photoUploadForbidden: 'You do not have permission to upload photos for this order.',
    videoUploadForbidden: 'You do not have permission to upload videos for this order.',
    photoSizeLimit: 'Compressed photos must be 5 MB or smaller.',
    videoSizeLimit: 'Videos must be 50 MB or smaller.',
    videoDurationLimit: 'Videos must be 60 seconds or shorter.',
    unsupportedMedia: 'Upload a JPEG, PNG, HEIC, MP4, or MOV file.',
    mediaStorageUnavailable: 'Private file storage is not configured for this branch yet.',
    photo: 'Photo',
    video: 'Video',
    downloadFile: 'Download',
    noFilesYet: 'No files attached.',
    scheduleChangeRequests: 'Appointment responses',
    scheduleRequestTypeCONFIRM: 'Appointment confirmation',
    scheduleRequestTypeRESCHEDULE: 'Reschedule request',
    scheduleRequestTypeCANCEL: 'Cancellation request',
    scheduleChangeAlreadyDecided: 'This appointment response is no longer pending.',
    scheduleChangeStale: 'The schedule changed after this request was submitted. Review the current appointment.',
    decisionReason: 'Decision reason',
    appointmentContactSaved: 'Appointment contact saved.',
    addWorkLog: 'Record work time',
    workLogs: 'Work logs',
    workLogStart: 'Start date and time',
    workLogEnd: 'End date and time',
    invalidWorkLog: 'Enter valid start and end times; the end must be after the start.',
    addMaterial: 'Record material',
    materials: 'Materials',
    materialDescription: 'Material description',
    materialUnitCost: 'Actual unit cost (USD)',
    materialCustomerCharge: 'Customer charge for this material (USD, optional)',
    materialPayer: 'Who paid',
    employeePayer: 'Employee/helper',
    otherPayer: 'Other',
    payerDescription: 'Payer description',
    materialPayerRequired: 'Select or describe who paid for this material.',
    materialChargeFixed: 'A material charge cannot be added separately to a fixed-price order.',
    actualCost: 'Actual cost',
    customerCharge: 'Customer charge',
    paidBy: 'Paid by',
    addAdjustment: 'Record adjustment',
    adjustments: 'Work order adjustments',
    adjustmentType: 'Adjustment type',
    scopeChange: 'Scope change',
    priceChange: 'Price adjustment',
    timeAndMaterialsCharge: 'Time and materials charge',
    adjustmentAmount: 'Amount delta (+/− USD)',
    adjustmentReason: 'Reason',
    invalidAdjustment: 'Check the adjustment type, amount and scope details.',
    voidRecord: 'Void record',
    voided: 'Voided',
    voidReasonPrompt: 'Enter a reason to void this record:',
    addEmployee: 'Add employee/helper',
    calendarColor: 'Calendar color',
    canUpdateProgress: 'Can update work progress',
    canAddNotes: 'Can add work notes',
    canUploadPhotos: 'Can upload photos',
    canUploadVideos: 'Can upload videos',
    employeeActive: 'Active',
    employeeSaved: 'Employee saved.',
    employeeCodeEmailRequirement: 'An email address is required to assign this employee and send the order-specific access code.',
    invalidEmployeeEmail: 'Enter a valid employee email address.',
    employeeEmailRequired: 'Add an employee email before assigning this employee.',
    assignmentExists: 'This employee is already assigned to this work order.',
    assignmentSaved: 'Employee assigned; the access code was sent by email.',
    assignmentDeliveryFailed: 'Assignment saved, but the code email failed. Resend the code after checking the employee email.',
    assignedEmployees: 'Assigned employees',
    owner: 'Owner',
    ownerAssigned: 'Owner assigned to this order.',
    ownerAlreadyAssigned: 'The owner is already assigned to this work order.',
    assignOwner: 'Assign owner',
    assignEmployee: 'Assign employee',
    revokeAssignment: 'Remove assignment',
    accessCodeActive: 'Access code active',
    accessCodeRevoked: 'Access code revoked',
    resendAccessCode: 'Resend access code',
    assignmentRevoked: 'Assignment revoked; order access is no longer valid.',
    accessCodeEmailOnly: 'Access codes are currently sent by email only.',
    assignedWorkOrderTitle: 'Assigned work order',
    employeeAccessInstructions: 'Enter the code from the assignment email. It only opens this order; it is not an account login.',
    workOrderAccessCode: 'Work order access code',
    openAssignedWorkOrder: 'Open assigned order',
    employeeAccessInvalid: 'This access code is invalid, expired, revoked, or the order is no longer active.',
    orderAccessDetails: 'Property access details',
    lockboxAuditNotice: 'Reveal only the access detail needed on site. Each reveal is recorded.',
    updateProgress: 'Update progress',
    progressStarted: 'Start work',
    progressInProgress: 'In progress',
    progressCompleted: 'Complete work',
    employeeWorkCompleted: 'Work marked complete. This order access code has been revoked.',
    progressSaved: 'Progress saved.',
    progressForbidden: 'You do not have permission to update progress.',
    notesForbidden: 'You do not have permission to add notes.',
    progressTransitionInvalid: 'That progress update is not allowed. Continue from the latest recorded step.',
    addWorkNote: 'Work note',
    saveNote: 'Save note',
    progressHistory: 'Progress and notes',
    noteAdded: 'Note added',
    approvedAdditionalWork: 'Approved additional work',
    createWorkOrder: 'Create work order',
    convertEstimate: 'Create work order from accepted estimate',
    workOrderTitle: 'Work title',
    workOrderScope: 'Agreed scope',
    pricingType: 'Pricing type',
    fixedPrice: 'Fixed price',
    timeAndMaterials: 'Time and materials',
    agreedTotal: 'Agreed total (USD, optional)',
    workOrderStatus: 'Work status',
    statusPendingSchedule: 'Pending schedule',
    statusScheduled: 'Scheduled',
    statusInProgress: 'In progress',
    statusCompleted: 'Completed',
    statusRescheduled: 'Rescheduled',
    statusCanceled: 'Canceled',
    workOrderCreated: 'Work order created.',
    estimateNotAccepted: 'Only an accepted estimate can become a work order.',
    estimateAlreadyConverted: 'This estimate already has a work order.',
    workOrderReasonPrompt: 'Enter the reason for this status change:',
    workOrderNumber: 'Work order',
    priority: 'Priority',
    priorityLow: 'Low',
    priorityNormal: 'Normal',
    priorityHigh: 'High',
    priorityUrgent: 'Urgent',
    schedule: 'Schedule',
    scheduleStart: 'Start date and time',
    estimatedDuration: 'Estimated duration (minutes)',
    scheduleSaved: 'Schedule saved.',
    scheduleConflicts: 'Schedule saved with {count} overlapping work order(s):',
    scheduleTimeZone: 'Times are entered and shown in the workspace time zone',
    scheduleReasonPrompt: 'Optional reason for this schedule change:',
    scheduleHistory: 'Schedule history',
    durationMinutes: 'min',
    invalidScheduleTime: 'Choose a valid local date and time. Daylight-saving gaps cannot be scheduled.',
    invalidScheduleDuration: 'Estimated duration must be at least 15 minutes and no more than 7 days.',
    invalidWorkOrderPriority: 'Choose a valid priority.',
    workOrderLocked: 'Completed or canceled work orders cannot be rescheduled.',
    scheduleRequired: 'Enter a date and estimated duration to schedule this work order.',
    billingPending: 'Pending to invoice',
    invalidWorkOrderStatus: 'That work status change is not allowed.',
    workOrderReasonRequired: 'Provide a reason for canceling or marking work incomplete/rescheduled.',
    addRequest: 'Add request',
    requestName: 'Requester name',
    requestDescription: 'Requested work',
    requestStatus: 'Request status',
    addEstimate: 'Create estimate',
    estimateScope: 'Scope summary',
    estimateRecipientType: 'Bill to',
    taxable: 'This document is taxable',
    taxRate: 'Tax rate (%)',
    discountType: 'Discount type',
    noDiscount: 'No discount',
    fixedDiscount: 'Fixed amount',
    percentageDiscount: 'Percentage',
    discountValue: 'Discount value',
    lineItems: 'Line items',
    lineDescription: 'Description',
    quantity: 'Quantity',
    unitPrice: 'Unit price (USD)',
    addLine: 'Add line item',
    removeLine: 'Remove',
    saveDraft: 'Save draft',
    editEstimate: 'Edit draft / create version',
    downloadPdf: 'Download PDF',
    sendEstimate: 'Send estimate',
    emailRecipients: 'Email recipients (comma-separated)',
    acceptEstimate: 'Accept estimate',
    estimateLinkTitle: 'Review your estimate',
    estimateAccepted: 'Estimate accepted. Thank you.',
    estimateSendSummary: 'Email attempts: {sent} sent, {failed} failed.',
    statusReceived: 'Received',
    statusInReview: 'In review',
    statusEstimated: 'Estimated',
    statusAgreedDirect: 'Agreed directly',
    statusNotAccepted: 'Not accepted',
    statusClosed: 'Closed',
    requestBillTo: 'Associated party',
    none: 'None',
    selectParty: 'Select a record',
    selectProperty: 'Select a property',
    estimateDraft: 'Draft',
    estimateSent: 'Sent',
    estimateAcceptedStatus: 'Accepted',
    estimateRejected: 'Rejected',
    estimateExpired: 'Expired',
    estimateSaved: 'Estimate draft saved.',
    linkedRequest: 'Related request',
    versionHistory: 'Version history',
    versionLabel: 'Version',
    estimateAcceptedWithNumber: 'Estimate {number} accepted. Thank you.',
    estimateAcceptanceInstructions: 'Confirm below to record your acceptance of the latest estimate version.',
    invalidRequestStatus: 'Choose a valid request status.',
    propertyRequired: 'Select a property.',
    lineRequired: 'Add at least one line item.',
    recipientRequired: 'Select at least one email recipient.',
    estimateLinkInvalid: 'This estimate link is invalid or expired. Contact the business for an updated estimate.',
    taxRateRequired: 'Set a tax rate for this taxable estimate.',
    estimatePriceRequired: 'Enter a price for every estimate line before sending.',
    estimateLocked: 'This estimate can no longer be changed.',
    invalidEstimateRecipient: 'Choose exactly one customer or property manager.',
    addCustomer: 'Add customer',
    addPropertyManager: 'Add property manager',
    addProperty: 'Add property',
    person: 'Person',
    company: 'Company',
    name: 'Name',
    companyName: 'Company name',
    phone: 'Phone',
    notes: 'Notes',
    addressLine1: 'Street address',
    addressLine2: 'Address line 2',
    city: 'City',
    state: 'State',
    postalCode: 'ZIP code',
    relationshipHistory: 'Property relationship history',
    addRelationship: 'Add relationship',
    relationshipRole: 'Relationship type',
    propertyOwner: 'Owner/customer',
    propertyManager: 'Property manager',
    linkedParty: 'Related customer or manager',
    startDate: 'Effective from',
    endDate: 'Effective until',
    endRelationship: 'End relationship',
    accessCredentials: 'Property access credentials',
    addAccessCredential: 'Add access credential',
    credentialType: 'Access type',
    credentialLabel: 'Label',
    credentialValue: 'Sensitive access value',
    lockbox: 'Lockbox',
    doorCode: 'Door code',
    accessInstructions: 'Access instructions',
    keyLocation: 'Key location',
    otherAccess: 'Other',
    reveal: 'Reveal value',
    hideValue: 'Hide value',
    accessWarning: 'Access values are encrypted and audited. Do not put codes in general notes.',
    lockboxKeyMissing: 'Lockbox encryption is not configured. Ask the owner to set the local encryption key.',
    workspaceName: 'Business name',
    timeZone: 'IANA time zone (for example, America/Chicago)',
    createWorkspace: 'Create workspace',
    signOut: 'Sign out',
    backToLogin: 'Back to sign in',
    passwordMismatch: 'Passwords do not match.',
    accountRequestSent: 'If the account can receive this email, instructions will be sent.',
    requestSubmitted: 'If the account can receive this email, instructions will be sent.',
    resetComplete: 'Password updated. You can sign in again.',
    genericError: 'Something went wrong. Please try again.',
    invalidLink: 'This link is invalid or expired. Request a new one.',
    missingToken: 'This link is missing its token. Request a new one.',
    loadingWorkspaces: 'Loading workspaces…',
    noWorkspaces: 'You do not have a workspace yet.',
    noRecords: 'No records yet.',
    editRecord: 'Edit record',
    updateRecord: 'Save changes',
    cancelEdit: 'Cancel edit',
    deactivate: 'Deactivate',
    customerType: 'Customer type',
    country: 'Country code',
    backToProperties: 'Back to properties',
    emailNotConfigured: 'Email delivery is not configured yet.',
    emailDeliveryFailed: 'The email could not be sent. Check the sender configuration.',
    invalidCredentials: 'Email or password is incorrect.',
    authRequired: 'Please sign in to continue.',
    workspaceNotFound: 'Workspace was not found.',
    invalidEmail: 'Enter a valid email address.',
    invalidPassword: 'Password must be 12–128 characters.',
    invalidTimeZone: 'Enter a valid IANA time zone.',
    invalidWorkspaceName: 'Workspace name must be 2–160 characters.',
    invalidCustomerType: 'Choose person or company.',
    invalidPropertyRelationship: 'Choose exactly one customer or property manager.',
    invalidRelationshipDates: 'The end date cannot be before the start date.',
    invalidAccessType: 'Choose a supported access type.',
    accessValueUnavailable: 'The access value is unavailable. Contact the owner.',
  },
  es: {
    eyebrow: 'Tu negocio, en orden',
    title: 'Menos vueltas. Más trabajo hecho.',
    description: 'Un lugar claro para tus clientes, trabajos, agenda, presupuestos y cobros.',
    status: 'Base del proyecto',
    ready: 'Listo para construir',
    language: 'English',
    next: 'Estamos preparando el espacio para organizar tu trabajo diario.',
    footer: 'Hecho para quienes mantienen todo en funcionamiento.',
    signIn: 'Iniciar sesión',
    createAccount: 'Crear cuenta',
    registerTitle: 'Crea tu cuenta de dueño',
    loginTitle: 'Bienvenido de nuevo',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirma la contraseña',
    register: 'Registrarme',
    login: 'Iniciar sesión',
    forgotPassword: '¿Olvidaste tu contraseña?',
    sendReset: 'Enviar enlace de recuperación',
    updatePassword: 'Actualizar contraseña',
    verifyTitle: 'Verifica tu correo',
    verifying: 'Verificando tu correo…',
    verified: 'Tu correo está verificado. Ya puedes iniciar sesión.',
    resetTitle: 'Restablece tu contraseña',
    workspaceTitle: 'Tus espacios de trabajo',
    settings: 'Configuración',
    languageSetting: 'Idioma de la interfaz',
    saveSettings: 'Guardar configuración',
    saving: 'Guardando…',
    settingsSaved: 'Se guardó la preferencia de idioma.',
    languageSaveFailed: 'No se pudo guardar el idioma.',
    english: 'Inglés',
    spanish: 'Español',
    openWorkspace: 'Abrir espacio',
    backToWorkspaces: 'Volver a espacios',
    workspaceDetail: 'El espacio está listo. La gestión de clientes y propiedades será el siguiente módulo.',
    customers: 'Clientes',
    propertyManagers: 'Administradoras',
    properties: 'Propiedades',
    requests: 'Solicitudes de servicio',
    estimates: 'Presupuestos',
    workOrders: 'Órdenes de trabajo',
    employees: 'Empleados y ayudantes',
    calendarView: 'Vista de calendario',
    listView: 'Vista de lista',
    previousMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    noScheduledWork: 'Sin trabajos programados',
    calendarConflictScope: 'Los avisos comparan órdenes que comparten dueño o empleado asignado.',
    workActuals: 'Horas, materiales y ajustes',
    actualsAccountingNotice: 'Son registros operativos, no informes contables. Las horas y costos de materiales no cambian automáticamente el total acordado de la orden.',
    additionalAuthorizationNotice: 'Estos ajustes no aprueban trabajos adicionales. Registra por separado una autorización verificable del cliente antes de realizar alcance extra.',
    additionalWork: 'Autorización de trabajo adicional',
    additionalWorkTitle: 'Título del trabajo adicional',
    additionalWorkReason: '¿Por qué se necesita este trabajo adicional?',
    additionalWorkDescription: 'Descripción del alcance adicional',
    estimatedAmount: 'Importe estimado (USD)',
    approvedAmount: 'Importe autorizado por el cliente (USD)',
    requestAuthorization: 'Registrar solicitud de autorización',
    authorizationMethod: '¿Cómo lo autorizó el cliente?',
    inPersonAuthorization: 'En persona',
    phoneAuthorization: 'Por teléfono',
    authorizedByName: 'Nombre de quien autorizó',
    authorizationDetails: 'Detalles verificables de autorización',
    confirmCustomerAuthorization: 'Verifiqué que el cliente aprobó explícitamente el trabajo y el importe.',
    confirmCustomerAuthorizationRequired: 'Se requiere autorización explícita y verificable; el silencio no es aprobación.',
    recordApproval: 'Registrar aprobación del cliente',
    rejectAdditionalWork: 'Registrar rechazo del cliente',
    cancelAdditionalWork: 'Cancelar solicitud',
    additionalDecisionReasonPrompt: 'Indica por qué se rechazó o canceló el trabajo adicional:',
    authorizationRecorded: 'Autorización registrada',
    authorizationHistory: 'Historial de autorización',
    additionalWorkAlreadyDecided: 'Esta solicitud de trabajo adicional ya no está pendiente.',
    additionalWorkConflict: 'La solicitud cambió; vuelve a cargar la orden e intenta de nuevo.',
    additionalWorkPENDING_AUTHORIZATION: 'Pendiente de autorización',
    additionalWorkAPPROVED: 'Aprobado',
    additionalWorkREJECTED: 'Rechazado',
    additionalWorkCANCELED: 'Cancelado',
    appointmentContact: 'Contacto para la cita',
    contactType: 'Tipo de contacto',
    contactTenant: 'Inquilino / contacto de acceso',
    contactCustomer: 'Contacto del cliente',
    contactOther: 'Otro contacto',
    saveAppointmentContact: 'Guardar contacto de la cita',
    sendAppointmentOptions: 'Enviar opciones de cita por email',
    appointmentLinkSent: 'Se envió el email con opciones de cita.',
    appointmentLinkFailed: 'Falló el email del enlace. Verifica el correo de contacto e inténtalo de nuevo.',
    appointmentContactRequired: 'Se requiere un email válido para la cita. En una propiedad administrada, agrega el contacto/inquilino; no se enviará a la administradora por defecto.',
    appointmentNotScheduled: 'Programa la orden antes de enviar opciones de cita.',
    appointmentLinkInvalid: 'El enlace de cita no es válido, venció o ya no corresponde a la cita actual.',
    appointmentResponseTitle: 'Respuesta sobre la cita',
    loadingAppointment: 'Cargando cita…',
    scheduledFor: 'Programada para',
    appointmentTimeZone: 'Las horas se muestran en',
    appointmentResponse: 'Tu respuesta',
    confirmAppointment: 'Confirmar cita',
    requestReschedule: 'Solicitar otro horario',
    requestCancellation: 'Solicitar cancelación',
    proposedAppointmentTime: 'Fecha y hora solicitadas',
    requestReason: 'Motivo de la solicitud',
    scheduleChangePendingNotice: 'La solicitud no cambia la agenda. El dueño del negocio debe revisarla.',
    submitAppointmentResponse: 'Enviar respuesta',
    appointmentConfirmed: 'Se registró la confirmación de la cita.',
    appointmentRequestPending: 'La solicitud se envió al dueño del negocio y está pendiente de revisión.',
    scheduleChangePending: 'Pendiente de decisión del dueño',
    scheduleChangeConfirmed: 'Confirmada',
    scheduleChangeApproved: 'Aprobada',
    scheduleChangeRejected: 'Rechazada',
    approveScheduleRequest: 'Aprobar solicitud',
    rejectScheduleRequest: 'Rechazar solicitud',
    rejectScheduleReasonPrompt: 'Indica el motivo del rechazo:',
    scheduleRequestApproved: 'Se aprobó la solicitud y se actualizó la agenda de la orden.',
    scheduleRequestRejected: 'Se rechazó la solicitud; la agenda permanece sin cambios.',
    scheduleRequestConflict: 'Solicitud aprobada con {count} conflicto(s):',
    offlinePrepareButton: 'Preparar esta orden para uso sin conexión',
    offlinePrepared: 'Orden cifrada y preparada para uso sin conexión. Ingresa de nuevo el código para abrirla en este dispositivo.',
    offlinePrepareFailed: 'No se pudo preparar la orden cifrada para uso sin conexión.',
    offlineMustPrepare: 'Prepara esta orden mientras tienes conexión antes de usarla sin señal.',
    offlineQueueFull: 'Sincroniza los avances pendientes antes de agregar más eventos offline.',
    offlineRevocationNotice: 'Este dispositivo no recibe cancelaciones o revocaciones mientras esté desconectado. Solo está disponible esta orden preparada.',
    offlineProgressQueued: 'El avance se cifró y quedó en cola. Se sincronizará al recuperar conexión.',
    offlineCompletionQueued: 'La finalización está en cola. El servidor revocará el acceso al sincronizar; un dispositivo desconectado aún no puede recibir la revocación.',
    offlineSyncFailed: 'Los cambios offline siguen cifrados en este dispositivo y se reintentará al conectar.',
    offlineDataCleared: 'Se sincronizaron los cambios y se borraron los datos locales porque el acceso ya no está vigente.',
    offlineConflictsSent: '{count} evento(s) offline requieren revisión del dueño; se conservaron ambos historiales.',
    offlineSyncComplete: 'Se sincronizaron los cambios offline.',
    offlineLockboxNotPrepared: 'Este lockbox no se incluyó al preparar la orden con conexión.',
    offlineLockboxAuditQueued: 'El acceso offline al lockbox se registró localmente y se sincronizará después.',
    offlineRevocationWarning: 'El dispositivo podría seguir desconectado. La cancelación o revocación no llegará hasta que se reconecte. ¿Continuar?',
    employeeEmailChangeRevokes: 'Cambiar este email revoca los códigos vigentes. El dueño debe enviar un código nuevo a la dirección nueva.',
    offlineReviewTitle: 'Actividad offline que requiere revisión',
    offlineReviewNotice: 'Se conservaron tanto el evento del dispositivo como el historial actual. Decide explícitamente cómo resolver cada conflicto.',
    offlineProgressEvent: 'Evento de avance offline',
    offlineLockboxEvent: 'Acceso offline al lockbox',
    deviceTime: 'Hora del dispositivo',
    receivedTime: 'Recibido',
    conflictReason: 'Conflicto',
    applyOfflineEvent: 'Aplicar evento',
    dismissOfflineEvent: 'Descartar evento',
    acknowledgeOfflineAccess: 'Reconocer acceso',
    offlineResolutionReasonPrompt: 'Indica por qué resuelves este evento offline:',
    offlineEventResolved: 'Este evento offline ya fue resuelto.',
    offlineTerminalOrder: 'No se puede reabrir una orden terminal mediante un evento offline.',
    offlineEventConflict: 'La orden cambió; vuelve a cargar y revisar el conflicto.',
    orderFiles: 'Archivos de la orden',
    mediaPrivacyNotice: 'Los archivos son privados del espacio y la orden; cada carga y descarga verifica permisos.',
    addPhotos: 'Agregar fotos',
    addVideos: 'Agregar videos',
    uploadingMedia: 'Comprimiendo y cargando…',
    mediaUploaded: 'Se cargó el archivo.',
    photoUploadForbidden: 'No tienes permiso para subir fotos a esta orden.',
    videoUploadForbidden: 'No tienes permiso para subir videos a esta orden.',
    photoSizeLimit: 'Las fotos comprimidas deben pesar 5 MB o menos.',
    videoSizeLimit: 'Los videos deben pesar 50 MB o menos.',
    videoDurationLimit: 'Los videos deben durar 60 segundos o menos.',
    unsupportedMedia: 'Sube JPEG, PNG, HEIC, MP4 o MOV.',
    mediaStorageUnavailable: 'El almacenamiento privado aún no está configurado para esta rama.',
    photo: 'Foto',
    video: 'Video',
    downloadFile: 'Descargar',
    noFilesYet: 'No hay archivos adjuntos.',
    scheduleChangeRequests: 'Respuestas de la cita',
    scheduleRequestTypeCONFIRM: 'Confirmación de cita',
    scheduleRequestTypeRESCHEDULE: 'Solicitud de reprogramación',
    scheduleRequestTypeCANCEL: 'Solicitud de cancelación',
    scheduleChangeAlreadyDecided: 'Esta respuesta de cita ya no está pendiente.',
    scheduleChangeStale: 'La agenda cambió después de esta solicitud. Revisa la cita actual.',
    decisionReason: 'Motivo de la decisión',
    appointmentContactSaved: 'Se guardó el contacto para la cita.',
    addWorkLog: 'Registrar tiempo de trabajo',
    workLogs: 'Registros de tiempo',
    workLogStart: 'Fecha y hora de inicio',
    workLogEnd: 'Fecha y hora de fin',
    invalidWorkLog: 'Ingresa horas válidas; el fin debe ser posterior al inicio.',
    addMaterial: 'Registrar material',
    materials: 'Materiales',
    materialDescription: 'Descripción del material',
    materialUnitCost: 'Costo unitario real (USD)',
    materialCustomerCharge: 'Cargo al cliente por este material (USD, opcional)',
    materialPayer: 'Quién pagó',
    employeePayer: 'Empleado/ayudante',
    otherPayer: 'Otro',
    payerDescription: 'Descripción de quién pagó',
    materialPayerRequired: 'Selecciona o describe quién pagó este material.',
    materialChargeFixed: 'No se puede cobrar un material por separado en una orden de precio fijo.',
    actualCost: 'Costo real',
    customerCharge: 'Cargo al cliente',
    paidBy: 'Pagado por',
    addAdjustment: 'Registrar ajuste',
    adjustments: 'Ajustes de la orden',
    adjustmentType: 'Tipo de ajuste',
    scopeChange: 'Cambio de alcance',
    priceChange: 'Ajuste de precio',
    timeAndMaterialsCharge: 'Cargo de tiempo y materiales',
    adjustmentAmount: 'Cambio de importe (+/− USD)',
    adjustmentReason: 'Motivo',
    invalidAdjustment: 'Revisa el tipo, importe y detalle del ajuste.',
    voidRecord: 'Anular registro',
    voided: 'Anulado',
    voidReasonPrompt: 'Indica el motivo para anular este registro:',
    addEmployee: 'Agregar empleado/ayudante',
    calendarColor: 'Color del calendario',
    canUpdateProgress: 'Puede actualizar el avance',
    canAddNotes: 'Puede agregar notas de trabajo',
    canUploadPhotos: 'Puede subir fotos',
    canUploadVideos: 'Puede subir videos',
    employeeActive: 'Activo',
    employeeSaved: 'Se guardó el empleado.',
    employeeCodeEmailRequirement: 'Se requiere email para asignar al empleado y enviar el código de acceso específico de la orden.',
    invalidEmployeeEmail: 'Ingresa un email válido para el empleado.',
    employeeEmailRequired: 'Agrega el email del empleado antes de asignarlo.',
    assignmentExists: 'Este empleado ya está asignado a esta orden.',
    assignmentSaved: 'Empleado asignado; se envió el código por email.',
    assignmentDeliveryFailed: 'Se guardó la asignación, pero falló el email del código. Reenvíalo después de verificar el email.',
    assignedEmployees: 'Empleados asignados',
    owner: 'Dueño',
    ownerAssigned: 'Se asignó al dueño a esta orden.',
    ownerAlreadyAssigned: 'El dueño ya está asignado a esta orden.',
    assignOwner: 'Asignarme como recurso',
    assignEmployee: 'Asignar empleado',
    revokeAssignment: 'Retirar asignación',
    accessCodeActive: 'Código activo',
    accessCodeRevoked: 'Código revocado',
    resendAccessCode: 'Reenviar código de acceso',
    assignmentRevoked: 'Se revocó la asignación; el código ya no da acceso.',
    accessCodeEmailOnly: 'Por ahora los códigos se envían solo por email.',
    assignedWorkOrderTitle: 'Orden de trabajo asignada',
    employeeAccessInstructions: 'Ingresa el código del email de asignación. Solo abre esta orden; no es una cuenta de usuario.',
    workOrderAccessCode: 'Código de acceso a la orden',
    openAssignedWorkOrder: 'Abrir orden asignada',
    employeeAccessInvalid: 'El código no es válido, venció, fue revocado o la orden ya no está activa.',
    orderAccessDetails: 'Datos de acceso a la propiedad',
    lockboxAuditNotice: 'Revela solo el dato necesario en el sitio. Cada consulta queda registrada.',
    updateProgress: 'Actualizar avance',
    progressStarted: 'Iniciar trabajo',
    progressInProgress: 'En progreso',
    progressCompleted: 'Completar trabajo',
    employeeWorkCompleted: 'Trabajo completado. Se revocó este código de acceso.',
    progressSaved: 'Se guardó el avance.',
    progressForbidden: 'No tienes permiso para actualizar el avance.',
    notesForbidden: 'No tienes permiso para agregar notas.',
    progressTransitionInvalid: 'Ese avance no está permitido. Continúa desde el último paso registrado.',
    addWorkNote: 'Nota del trabajo',
    saveNote: 'Guardar nota',
    progressHistory: 'Avance y notas',
    noteAdded: 'Nota agregada',
    approvedAdditionalWork: 'Trabajo adicional aprobado',
    createWorkOrder: 'Crear orden de trabajo',
    convertEstimate: 'Crear orden desde presupuesto aceptado',
    workOrderTitle: 'Título del trabajo',
    workOrderScope: 'Alcance acordado',
    pricingType: 'Modalidad de cobro',
    fixedPrice: 'Precio fijo',
    timeAndMaterials: 'Tiempo y materiales',
    agreedTotal: 'Total acordado (USD, opcional)',
    workOrderStatus: 'Estado del trabajo',
    statusPendingSchedule: 'Pendiente de programar',
    statusScheduled: 'Programada',
    statusInProgress: 'En progreso',
    statusCompleted: 'Completada',
    statusRescheduled: 'Reprogramada',
    statusCanceled: 'Cancelada',
    workOrderCreated: 'Se creó la orden de trabajo.',
    estimateNotAccepted: 'Solo se puede convertir un presupuesto aceptado en orden.',
    estimateAlreadyConverted: 'Este presupuesto ya tiene una orden de trabajo.',
    workOrderReasonPrompt: 'Escribe el motivo del cambio de estado:',
    workOrderNumber: 'Orden de trabajo',
    priority: 'Prioridad',
    priorityLow: 'Baja',
    priorityNormal: 'Normal',
    priorityHigh: 'Alta',
    priorityUrgent: 'Urgente',
    schedule: 'Agenda',
    scheduleStart: 'Fecha y hora de inicio',
    estimatedDuration: 'Duración estimada (minutos)',
    scheduleSaved: 'Se guardó la programación.',
    scheduleConflicts: 'Se guardó con {count} orden(es) que se solapan:',
    scheduleTimeZone: 'Las horas se ingresan y muestran en la zona horaria del espacio',
    scheduleReasonPrompt: 'Motivo opcional del cambio de agenda:',
    scheduleHistory: 'Historial de agenda',
    durationMinutes: 'min',
    invalidScheduleTime: 'Elige una fecha y hora local válida. No se puede programar dentro del salto de horario de verano.',
    invalidScheduleDuration: 'La duración debe ser de al menos 15 minutos y como máximo 7 días.',
    invalidWorkOrderPriority: 'Elige una prioridad válida.',
    workOrderLocked: 'No se pueden reprogramar órdenes completadas o canceladas.',
    scheduleRequired: 'Ingresa fecha y duración estimada para programar el trabajo.',
    billingPending: 'Pendiente de facturar',
    invalidWorkOrderStatus: 'Ese cambio de estado del trabajo no está permitido.',
    workOrderReasonRequired: 'Indica el motivo de cancelación, trabajo incompleto o reprogramación.',
    addRequest: 'Agregar solicitud',
    requestName: 'Nombre de quien solicita',
    requestDescription: 'Trabajo solicitado',
    requestStatus: 'Estado de solicitud',
    addEstimate: 'Crear presupuesto',
    estimateScope: 'Resumen del alcance',
    estimateRecipientType: 'Facturar a',
    taxable: 'Este documento está sujeto a impuesto',
    taxRate: 'Tasa de impuesto (%)',
    discountType: 'Tipo de descuento',
    noDiscount: 'Sin descuento',
    fixedDiscount: 'Importe fijo',
    percentageDiscount: 'Porcentaje',
    discountValue: 'Valor del descuento',
    lineItems: 'Partidas',
    lineDescription: 'Descripción',
    quantity: 'Cantidad',
    unitPrice: 'Precio unitario (USD)',
    addLine: 'Agregar partida',
    removeLine: 'Quitar',
    saveDraft: 'Guardar borrador',
    editEstimate: 'Editar borrador / crear versión',
    downloadPdf: 'Descargar PDF',
    sendEstimate: 'Enviar presupuesto',
    emailRecipients: 'Destinatarios email (separados por coma)',
    acceptEstimate: 'Aceptar presupuesto',
    estimateLinkTitle: 'Revisa tu presupuesto',
    estimateAccepted: 'Presupuesto aceptado. Gracias.',
    estimateSendSummary: 'Intentos de envío: {sent} enviados, {failed} fallidos.',
    statusReceived: 'Recibida',
    statusInReview: 'En revisión',
    statusEstimated: 'Presupuestada',
    statusAgreedDirect: 'Acordada directamente',
    statusNotAccepted: 'No aceptada',
    statusClosed: 'Cerrada',
    requestBillTo: 'Parte relacionada',
    none: 'Ninguno',
    selectParty: 'Selecciona un registro',
    selectProperty: 'Selecciona una propiedad',
    estimateDraft: 'Borrador',
    estimateSent: 'Enviado',
    estimateAcceptedStatus: 'Aceptado',
    estimateRejected: 'Rechazado',
    estimateExpired: 'Vencido',
    estimateSaved: 'Se guardó el borrador del presupuesto.',
    linkedRequest: 'Solicitud relacionada',
    versionHistory: 'Historial de versiones',
    versionLabel: 'Versión',
    estimateAcceptedWithNumber: 'Presupuesto {number} aceptado. Gracias.',
    estimateAcceptanceInstructions: 'Confirma abajo para registrar tu aceptación de la última versión del presupuesto.',
    invalidRequestStatus: 'Elige un estado de solicitud válido.',
    propertyRequired: 'Selecciona una propiedad.',
    lineRequired: 'Agrega al menos una partida.',
    recipientRequired: 'Selecciona al menos un destinatario de email.',
    estimateLinkInvalid: 'El enlace no es válido o venció. Contacta al negocio para pedir un presupuesto actualizado.',
    taxRateRequired: 'Configura la tasa de impuesto para este presupuesto gravable.',
    estimatePriceRequired: 'Completa el precio de cada partida antes de enviar.',
    estimateLocked: 'Este presupuesto ya no se puede cambiar.',
    invalidEstimateRecipient: 'Elige exactamente un cliente o una administradora.',
    addCustomer: 'Agregar cliente',
    addPropertyManager: 'Agregar administradora',
    addProperty: 'Agregar propiedad',
    person: 'Persona',
    company: 'Empresa',
    name: 'Nombre',
    companyName: 'Nombre de la empresa',
    phone: 'Teléfono',
    notes: 'Notas',
    addressLine1: 'Dirección',
    addressLine2: 'Dirección adicional',
    city: 'Ciudad',
    state: 'Estado',
    postalCode: 'Código postal',
    relationshipHistory: 'Historial de relaciones de la propiedad',
    addRelationship: 'Agregar relación',
    relationshipRole: 'Tipo de relación',
    propertyOwner: 'Propietario/cliente',
    propertyManager: 'Administradora',
    linkedParty: 'Cliente o administradora relacionada',
    startDate: 'Vigente desde',
    endDate: 'Vigente hasta',
    endRelationship: 'Finalizar relación',
    accessCredentials: 'Datos de acceso a la propiedad',
    addAccessCredential: 'Agregar dato de acceso',
    credentialType: 'Tipo de acceso',
    credentialLabel: 'Etiqueta',
    credentialValue: 'Dato sensible de acceso',
    lockbox: 'Lockbox',
    doorCode: 'Código de puerta',
    accessInstructions: 'Instrucciones de acceso',
    keyLocation: 'Ubicación de la llave',
    otherAccess: 'Otro',
    reveal: 'Mostrar dato',
    hideValue: 'Ocultar dato',
    accessWarning: 'Los datos de acceso se cifran y auditan. No pongas códigos en las notas generales.',
    lockboxKeyMissing: 'El cifrado de lockbox no está configurado. El dueño debe preparar la clave local.',
    workspaceName: 'Nombre del negocio',
    timeZone: 'Zona horaria IANA (por ejemplo, America/Chicago)',
    createWorkspace: 'Crear espacio de trabajo',
    signOut: 'Cerrar sesión',
    backToLogin: 'Volver a iniciar sesión',
    passwordMismatch: 'Las contraseñas no coinciden.',
    accountRequestSent: 'Si la cuenta puede recibir este correo, enviaremos instrucciones.',
    requestSubmitted: 'Si la cuenta puede recibir este correo, enviaremos instrucciones.',
    resetComplete: 'Contraseña actualizada. Ya puedes iniciar sesión.',
    genericError: 'Ocurrió un error. Inténtalo de nuevo.',
    invalidLink: 'El enlace no es válido o venció. Solicita uno nuevo.',
    missingToken: 'Falta el token del enlace. Solicita uno nuevo.',
    loadingWorkspaces: 'Cargando espacios de trabajo…',
    noWorkspaces: 'Todavía no tienes un espacio de trabajo.',
    noRecords: 'Todavía no hay registros.',
    editRecord: 'Editar registro',
    updateRecord: 'Guardar cambios',
    cancelEdit: 'Cancelar edición',
    deactivate: 'Desactivar',
    customerType: 'Tipo de cliente',
    country: 'Código de país',
    backToProperties: 'Volver a propiedades',
    emailNotConfigured: 'El envío de correos todavía no está configurado.',
    emailDeliveryFailed: 'No se pudo enviar el correo. Revisa la configuración del remitente.',
    invalidCredentials: 'El correo o la contraseña no son correctos.',
    authRequired: 'Inicia sesión para continuar.',
    workspaceNotFound: 'No se encontró el espacio de trabajo.',
    invalidEmail: 'Ingresa un correo electrónico válido.',
    invalidPassword: 'La contraseña debe tener entre 12 y 128 caracteres.',
    invalidTimeZone: 'Ingresa una zona horaria IANA válida.',
    invalidWorkspaceName: 'El nombre del negocio debe tener entre 2 y 160 caracteres.',
    invalidCustomerType: 'Elige persona o empresa.',
    invalidPropertyRelationship: 'Elige exactamente un cliente o una administradora.',
    invalidRelationshipDates: 'La fecha final no puede ser anterior a la inicial.',
    invalidAccessType: 'Elige un tipo de acceso válido.',
    accessValueUnavailable: 'El dato de acceso no está disponible. Contacta al dueño.',
  },
};

async function postJson(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function patchJson(url, data) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function detectInitialLanguage() {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('handy-language');
    if (saved === 'en' || saved === 'es') return saved;
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function apiError(body, text) {
  switch (body?.error?.code) {
    case 'EMAIL_PROVIDER_NOT_CONFIGURED':
      return text.emailNotConfigured;
    case 'EMAIL_DELIVERY_FAILED':
    case 'EMAIL_PROVIDER_UNREACHABLE':
      return text.emailDeliveryFailed;
    case 'INVALID_CREDENTIALS':
      return text.invalidCredentials;
    case 'AUTH_REQUIRED':
      return text.authRequired;
    case 'WORKSPACE_NOT_FOUND':
      return text.workspaceNotFound;
    case 'INVALID_EMAIL':
      return text.invalidEmail;
    case 'INVALID_PASSWORD':
      return text.invalidPassword;
    case 'INVALID_TIME_ZONE':
      return text.invalidTimeZone;
    case 'INVALID_WORKSPACE_NAME':
      return text.invalidWorkspaceName;
    case 'INVALID_CUSTOMER_TYPE':
      return text.invalidCustomerType;
    case 'INVALID_PROPERTY_RELATIONSHIP':
      return text.invalidPropertyRelationship;
    case 'INVALID_RELATIONSHIP_DATES':
      return text.invalidRelationshipDates;
    case 'INVALID_ACCESS_TYPE':
      return text.invalidAccessType;
    case 'ACCESS_VALUE_UNAVAILABLE':
      return text.accessValueUnavailable;
    case 'LOCKBOX_KEY_NOT_CONFIGURED':
    case 'LOCKBOX_KEY_INVALID':
      return text.lockboxKeyMissing;
    case 'INVALID_OR_EXPIRED_TOKEN':
      return text.invalidLink;
    case 'ESTIMATE_LINK_INVALID':
      return text.estimateLinkInvalid;
    case 'TAX_RATE_REQUIRED':
      return text.taxRateRequired;
    case 'INCOMPLETE_ESTIMATE_PRICE':
      return text.estimatePriceRequired;
    case 'ESTIMATE_LOCKED':
      return text.estimateLocked;
    case 'INVALID_ESTIMATE_RECIPIENT':
      return text.invalidEstimateRecipient;
    default:
      if (body?.error?.code?.startsWith('EMAIL_PROVIDER_HTTP_')) return text.emailDeliveryFailed;
      return text.genericError;
  }
}

function Shell({ text, language, setLanguage, isOwner, children }) {
  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Handy System home">
          <img src="/favicon.svg" alt="" width="38" height="38" />
          <span>Handy System</span>
        </a>
        {isOwner ? (
          <a className="secondary-link topbar-settings" href="/settings">{text.settings}</a>
        ) : (
          <button
            className="language-button"
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            aria-label={`Switch language to ${text.language}`}
          >
            {text.language}
          </button>
        )}
      </header>
      {children}
      <footer className="footer">{text.footer}</footer>
    </main>
  );
}

function Notice({ notice }) {
  if (!notice) return null;
  return <p className={`form-notice ${notice.type}`} role="status">{notice.message}</p>;
}

function Landing({ text }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1 id="hero-title">{text.title}</h1>
        <p className="description">{text.description}</p>
        <div className="landing-actions">
          <a className="primary-link" href="/register">{text.createAccount}</a>
          <a className="secondary-link" href="/login">{text.signIn}</a>
        </div>
        <div className="status-card" role="status">
          <span className="status-dot" />
          <span>{text.status}</span>
          <strong>{text.ready}</strong>
        </div>
      </div>

      <aside className="preview-card" aria-label={text.status}>
        <div className="preview-heading">
          <span className="preview-icon">HS</span>
          <span className="preview-label">HANDY SYSTEM</span>
        </div>
        <div className="preview-lines" aria-hidden="true"><span /><span /><span /></div>
        <p>{text.next}</p>
      </aside>
    </section>
  );
}

function RegisterPage({ text, language }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData(formElement);
      const { response, body } = await postJson('/api/auth/register', {
        email: form.get('email'),
        password: form.get('password'),
        preferredLanguage: language,
      });
      if (!response.ok) throw new Error(apiError(body, text));
      setNotice({ type: 'success', message: text.accountRequestSent });
      formElement.reset();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={text.registerTitle} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label>{text.email}<input name="email" type="email" autoComplete="email" required /></label>
        <label>{text.password}<input name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required /></label>
        <button className="primary-link" type="submit" disabled={busy}>{busy ? '…' : text.register}</button>
      </form>
      <p className="form-footnote"><a href="/login">{text.signIn}</a></p>
    </AuthCard>
  );
}

function LoginPage({ text }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData(event.currentTarget);
      const { response, body } = await postJson('/api/auth/login', {
        email: form.get('email'),
        password: form.get('password'),
      });
      if (!response.ok) throw new Error(apiError(body, text));
      if (body.data.preferredLanguage === 'en' || body.data.preferredLanguage === 'es') {
        window.localStorage.setItem('handy-language', body.data.preferredLanguage);
      }
      window.location.assign('/workspaces');
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={text.loginTitle} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label>{text.email}<input name="email" type="email" autoComplete="email" required /></label>
        <label>{text.password}<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="primary-link" type="submit" disabled={busy}>{busy ? '…' : text.login}</button>
      </form>
      <p className="form-footnote"><a href="/forgot-password">{text.forgotPassword}</a></p>
    </AuthCard>
  );
}

function ForgotPasswordPage({ text }) {
  const [notice, setNotice] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setNotice(null);
    try {
      const form = new FormData(event.currentTarget);
      const { response, body } = await postJson('/api/auth/password-reset/request', {
        email: form.get('email'),
      });
      if (!response.ok) throw new Error(apiError(body, text));
      setNotice({ type: 'success', message: text.requestSubmitted });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    }
  }

  return (
    <AuthCard title={text.forgotPassword} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label>{text.email}<input name="email" type="email" autoComplete="email" required /></label>
        <button className="primary-link" type="submit">{text.sendReset}</button>
      </form>
      <p className="form-footnote"><a href="/login">{text.backToLogin}</a></p>
    </AuthCard>
  );
}

function VerifyEmailPage({ text }) {
  const started = useRef(false);
  const [notice, setNotice] = useState({ type: 'pending', message: text.verifying });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    window.history.replaceState({}, document.title, '/verify-email');

    if (!token) {
      setNotice({ type: 'error', message: text.missingToken });
      return;
    }

    postJson('/api/auth/verify-email', { token })
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(apiError(body, text));
        setNotice({ type: 'success', message: text.verified });
      })
      .catch((error) => setNotice({ type: 'error', message: error.message || text.invalidLink }));
  }, [text]);

  return (
    <AuthCard title={text.verifyTitle} text={text} notice={notice}>
      {notice.type === 'success' && <a className="primary-link" href="/login">{text.signIn}</a>}
    </AuthCard>
  );
}

function ResetPasswordPage({ text }) {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    window.history.replaceState({}, document.title, '/reset-password');
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!token) {
      setNotice({ type: 'error', message: text.missingToken });
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = form.get('password');
    if (password !== form.get('confirmPassword')) {
      setNotice({ type: 'error', message: text.passwordMismatch });
      return;
    }

    try {
      const { response, body } = await postJson('/api/auth/password-reset/complete', { token, password });
      if (!response.ok) throw new Error(apiError(body, text));
      setNotice({ type: 'success', message: text.resetComplete });
      formElement.reset();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.invalidLink });
    }
  }

  return (
    <AuthCard title={text.resetTitle} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label>{text.password}<input name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required /></label>
        <label>{text.confirmPassword}<input name="confirmPassword" type="password" autoComplete="new-password" minLength="12" maxLength="128" required /></label>
        <button className="primary-link" type="submit">{text.updatePassword}</button>
      </form>
      {notice?.type === 'success' && <p className="form-footnote"><a href="/login">{text.signIn}</a></p>}
    </AuthCard>
  );
}

function WorkspacesPage({ text }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });

  async function refresh() {
    const response = await fetch('/api/workspaces');
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(apiError(body, text));
    setWorkspaces(body.data ?? []);
    setNotice(null);
  }

  useEffect(() => {
    refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, []);

  async function createWorkspace(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { response, body } = await postJson('/api/workspaces', {
      name: form.get('name'),
      timeZone: form.get('timeZone'),
    });
    if (!response.ok) {
      setNotice({ type: 'error', message: apiError(body, text) });
      return;
    }
    formElement.reset();
    await refresh();
  }

  async function signOut() {
    await postJson('/api/auth/logout', {});
    window.location.assign('/login');
  }

  return (
    <section className="auth-card workspace-card">
      <div className="workspace-heading">
        <h1>{text.workspaceTitle}</h1>
        <button className="secondary-button" type="button" onClick={signOut}>{text.signOut}</button>
      </div>
      <Notice notice={notice} />
      {workspaces.map((workspace) => (
        <article className="workspace-row" key={workspace.id}>
          <div className="workspace-summary">
            <strong>{workspace.name}</strong><span>{workspace.timeZone}</span>
          </div>
          <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}`}>{text.openWorkspace}</a>
        </article>
      ))}
      {workspaces.length === 0 && !notice && <p className="form-footnote">{text.noWorkspaces}</p>}
      <form className="auth-form workspace-form" onSubmit={createWorkspace}>
        <label>{text.workspaceName}<input name="name" minLength="2" maxLength="160" required /></label>
        <label>{text.timeZone}<input name="timeZone" placeholder="America/Chicago" maxLength="64" required /></label>
        <button className="primary-link" type="submit">{text.createWorkspace}</button>
      </form>
    </section>
  );
}

function CrmCollectionPage({ text, workspaceId, module }) {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const endpoint = `/api/workspaces/${encodeURIComponent(workspaceId)}/${module}`;
  const title = module === 'customers' ? text.customers : module === 'property-managers' ? text.propertyManagers : text.properties;
  const createLabel = module === 'customers' ? text.addCustomer : module === 'property-managers' ? text.addPropertyManager : text.addProperty;

  async function refresh() {
    const response = await fetch(endpoint);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(apiError(body, text));
    setItems(body.data ?? []);
    setNotice(null);
  }

  useEffect(() => {
    refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, [workspaceId, module]);

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = Object.fromEntries(new FormData(formElement).entries());
    setBusy(true);
    setNotice(null);
    try {
      const { response, body } = editing
        ? await patchJson(`${endpoint}/${encodeURIComponent(editing.id)}`, data)
        : await postJson(endpoint, data);
      if (!response.ok) throw new Error(apiError(body, text));
      formElement.reset();
      setEditing(null);
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{title}</h1>
      <p className="form-footnote"><a href={`/workspaces/${encodeURIComponent(workspaceId)}`}>{text.backToWorkspaces}</a></p>
      {notice && <Notice notice={notice} />}
      <div className="crm-list">
        {items.map((item) => {
          const label = item.name || item.addressLine1;
          const subtitle = module === 'properties'
            ? `${item.city}, ${item.state} ${item.postalCode}`
            : [item.companyName, item.email, item.phone].filter(Boolean).join(' · ');
          return (
            <article className="crm-row" key={item.id}>
              <div><strong>{label}</strong>{subtitle && <span>{subtitle}</span>}</div>
              {module === 'properties' && (
                <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspaceId)}/properties/${encodeURIComponent(item.id)}`}>
                  {text.openWorkspace}
                </a>
              )}
              <button className="secondary-button" type="button" onClick={() => { setEditing(item); setNotice(null); }}>
                {text.editRecord}
              </button>
            </article>
          );
        })}
      </div>
      {items.length === 0 && !notice && <p className="form-footnote">{text.noRecords}</p>}
      <form className="auth-form crm-form" key={editing?.id ?? 'new'} onSubmit={submit}>
        <h2>{editing ? text.editRecord : createLabel}</h2>
        {module === 'customers' && (
          <label>{text.customerType}
            <select name="type" defaultValue={editing?.type ?? 'PERSON'} required>
              <option value="PERSON">{text.person}</option>
              <option value="COMPANY">{text.company}</option>
            </select>
          </label>
        )}
        <label>{module === 'properties' ? text.addressLine1 : text.name}
          <input name={module === 'properties' ? 'addressLine1' : 'name'} defaultValue={module === 'properties' ? editing?.addressLine1 ?? '' : editing?.name ?? ''} maxLength={module === 'properties' ? 200 : 160} required />
        </label>
        {module === 'properties' ? (
          <>
            <label>{text.addressLine2}<input name="addressLine2" defaultValue={editing?.addressLine2 ?? ''} maxLength="200" /></label>
            <div className="form-grid">
              <label>{text.city}<input name="city" defaultValue={editing?.city ?? ''} maxLength="120" required /></label>
              <label>{text.state}<input name="state" defaultValue={editing?.state ?? ''} maxLength="80" required /></label>
            </div>
            <div className="form-grid">
              <label>{text.postalCode}<input name="postalCode" defaultValue={editing?.postalCode ?? ''} maxLength="20" required /></label>
              <label>{text.country}<input name="country" defaultValue={editing?.country ?? 'US'} maxLength="2" required /></label>
            </div>
          </>
        ) : (
          <>
            <label>{text.companyName}<input name="companyName" defaultValue={editing?.companyName ?? ''} maxLength="160" /></label>
            <div className="form-grid">
              <label>{text.email}<input name="email" type="email" defaultValue={editing?.email ?? ''} maxLength="254" /></label>
              <label>{text.phone}<input name="phone" type="tel" defaultValue={editing?.phone ?? ''} maxLength="40" /></label>
            </div>
          </>
        )}
        <label>{text.notes}<textarea name="notes" defaultValue={editing?.notes ?? ''} rows="3" maxLength="5000" /></label>
        <div className="form-actions">
          <button className="primary-link" type="submit" disabled={busy}>{busy ? text.saving : editing ? text.updateRecord : createLabel}</button>
          {editing && <button className="secondary-button" type="button" onClick={() => setEditing(null)}>{text.cancelEdit}</button>}
        </div>
      </form>
    </section>
  );
}

function PropertyDetailPage({ text, workspaceId, propertyId }) {
  const [property, setProperty] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [partyType, setPartyType] = useState('OWNER');
  const [revealed, setRevealed] = useState(null);
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });
  const [busy, setBusy] = useState(false);
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}`;

  async function requestData(url) {
    const response = await fetch(url);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(apiError(body, text));
    return body.data;
  }

  async function refresh() {
    const [propertyData, relationshipData, credentialData, customerData, managerData] = await Promise.all([
      requestData(`${base}/properties/${encodeURIComponent(propertyId)}`),
      requestData(`${base}/properties/${encodeURIComponent(propertyId)}/relationships`),
      requestData(`${base}/properties/${encodeURIComponent(propertyId)}/access-credentials`),
      requestData(`${base}/customers`),
      requestData(`${base}/property-managers`),
    ]);
    setProperty(propertyData);
    setRelationships(relationshipData);
    setCredentials(credentialData);
    setCustomers(customerData);
    setManagers(managerData);
    setNotice(null);
  }

  useEffect(() => {
    refresh().catch((error) => setNotice({ type: 'error', message: error.message || text.genericError }));
  }, [workspaceId, propertyId]);

  async function addRelationship(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    const partyId = values.get('partyId');
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const body = {
      startDate: values.get('startDate'),
      ...(partyType === 'OWNER' ? { customerId: partyId } : { propertyManagerId: partyId }),
    };
    setBusy(true);
    try {
      const { response, body: responseBody } = await postJson(
        `${base}/properties/${encodeURIComponent(propertyId)}/relationships`,
        body,
      );
      if (!response.ok) throw new Error(apiError(responseBody, text));
      formElement.reset();
      formElement.elements.startDate.value = today;
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function endRelationship(relationshipId) {
    const endDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const { response, body } = await postJson(
      `${base}/properties/${encodeURIComponent(propertyId)}/relationships/${encodeURIComponent(relationshipId)}/end`,
      { endDate },
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: apiError(body, text) });
      return;
    }
    await refresh();
  }

  async function addCredential(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setNotice(null);
    try {
      const { response, body } = await postJson(
        `${base}/properties/${encodeURIComponent(propertyId)}/access-credentials`,
        Object.fromEntries(new FormData(formElement).entries()),
      );
      if (!response.ok) throw new Error(apiError(body, text));
      formElement.reset();
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function revealCredential(credentialId) {
    setNotice(null);
    const { response, body } = await postJson(
      `${base}/properties/${encodeURIComponent(propertyId)}/access-credentials/${encodeURIComponent(credentialId)}/reveal`,
      {},
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: apiError(body, text) });
      return;
    }
    setRevealed(body.data);
  }

  async function deactivateCredential(credentialId) {
    const { response, body } = await postJson(
      `${base}/properties/${encodeURIComponent(propertyId)}/access-credentials/${encodeURIComponent(credentialId)}/deactivate`,
      {},
    );
    if (!response.ok) {
      setNotice({ type: 'error', message: apiError(body, text) });
      return;
    }
    if (revealed?.id === credentialId) setRevealed(null);
    await refresh();
  }

  if (!property && !notice) return null;
  const parties = partyType === 'OWNER' ? customers : managers;

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <p className="form-footnote"><a href={`/workspaces/${encodeURIComponent(workspaceId)}/properties`}>{text.backToProperties}</a></p>
      {notice && <Notice notice={notice} />}
      {property && (
        <>
          <h1 className="auth-title">{property.addressLine1}</h1>
          <p className="workspace-time-zone">{property.city}, {property.state} {property.postalCode}</p>

          <section className="crm-section">
            <h2>{text.relationshipHistory}</h2>
            {relationships.map((relationship) => (
              <article className="crm-row" key={relationship.id}>
                <div>
                  <strong>{relationship.customer?.name ?? relationship.propertyManager?.name}</strong>
                  <span>{relationship.role === 'OWNER' ? text.propertyOwner : text.propertyManager} · {relationship.startDate.slice(0, 10)}{relationship.endDate ? ` – ${relationship.endDate.slice(0, 10)}` : ''}</span>
                </div>
                {!relationship.endDate && (
                  <button className="secondary-button" type="button" onClick={() => endRelationship(relationship.id)}>
                    {text.endRelationship}
                  </button>
                )}
              </article>
            ))}
            <form className="auth-form crm-form" onSubmit={addRelationship}>
              <h3>{text.addRelationship}</h3>
              <label>{text.relationshipRole}
                <select value={partyType} onChange={(event) => setPartyType(event.target.value)}>
                  <option value="OWNER">{text.propertyOwner}</option>
                  <option value="PROPERTY_MANAGER">{text.propertyManager}</option>
                </select>
              </label>
              <label>{text.linkedParty}
                <select name="partyId" required defaultValue="">
                  <option value="" disabled>{text.selectParty}</option>
                  {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
                </select>
              </label>
              <label>{text.startDate}<input name="startDate" type="date" required defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)} /></label>
              <button className="primary-link" type="submit" disabled={busy}>{text.addRelationship}</button>
            </form>
          </section>

          <section className="crm-section">
            <h2>{text.accessCredentials}</h2>
            <p className="form-footnote">{text.accessWarning}</p>
            {credentials.map((credential) => (
              <article className="crm-row" key={credential.id}>
                <div><strong>{credential.label}</strong><span>{text[credential.type] ?? credential.type}</span></div>
                {revealed?.id === credential.id ? (
                  <span className="revealed-value">{revealed.value}</span>
                ) : (
                  <button className="secondary-button" type="button" onClick={() => revealCredential(credential.id)}>{text.reveal}</button>
                )}
                {revealed?.id === credential.id && (
                  <button className="secondary-button" type="button" onClick={() => setRevealed(null)}>{text.hideValue}</button>
                )}
                <button className="secondary-button" type="button" onClick={() => deactivateCredential(credential.id)}>{text.deactivate}</button>
              </article>
            ))}
            <form className="auth-form crm-form" onSubmit={addCredential}>
              <h3>{text.addAccessCredential}</h3>
              <label>{text.credentialType}
                <select name="type" defaultValue="LOCKBOX" required>
                  <option value="LOCKBOX">{text.lockbox}</option>
                  <option value="DOOR_CODE">{text.doorCode}</option>
                  <option value="ACCESS_INSTRUCTIONS">{text.accessInstructions}</option>
                  <option value="KEY_LOCATION">{text.keyLocation}</option>
                  <option value="OTHER">{text.otherAccess}</option>
                </select>
              </label>
              <label>{text.credentialLabel}<input name="label" maxLength="120" required /></label>
              <label>{text.credentialValue}<input name="value" type="password" maxLength="2048" autoComplete="off" required /></label>
              <button className="primary-link" type="submit" disabled={busy}>{text.addAccessCredential}</button>
            </form>
          </section>
        </>
      )}
    </section>
  );
}

function WorkspaceDetailPage({ text, workspaceId }) {
  const [workspace, setWorkspace] = useState(null);
  const [notice, setNotice] = useState({ type: 'pending', message: text.loadingWorkspaces });

  useEffect(() => {
    let active = true;
    fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiError(body, text));
        return body.data;
      })
      .then((data) => {
        if (!active) return;
        setWorkspace(data);
        setNotice(null);
      })
      .catch((error) => {
        if (active) setNotice({ type: 'error', message: error.message || text.genericError });
      });

    return () => { active = false; };
  }, [workspaceId, text]);

  return (
    <section className="auth-card workspace-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      {notice && <Notice notice={notice} />}
      {workspace && (
        <>
          <h1 className="auth-title">{workspace.name}</h1>
          <p className="workspace-time-zone">{workspace.timeZone}</p>
          <p className="description workspace-description">{text.workspaceDetail}</p>
          <nav className="workspace-module-links" aria-label={text.workspaceDetail}>
            <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}/customers`}>{text.customers}</a>
            <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}/property-managers`}>{text.propertyManagers}</a>
            <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}/properties`}>{text.properties}</a>
            <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}/requests`}>{text.requests}</a>
            <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}/estimates`}>{text.estimates}</a>
            <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}/work-orders`}>{text.workOrders}</a>
            <a className="secondary-link" href={`/workspaces/${encodeURIComponent(workspace.id)}/employees`}>{text.employees}</a>
          </nav>
          <a className="secondary-link" href="/workspaces">{text.backToWorkspaces}</a>
        </>
      )}
    </section>
  );
}

function SettingsPage({ text, language, onLanguageSaved }) {
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setSelectedLanguage(language), [language]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { response, body } = await patchJson('/api/auth/preferences/language', {
        preferredLanguage: selectedLanguage,
      });
      if (!response.ok) throw new Error(apiError(body, text));
      onLanguageSaved(body.data.preferredLanguage);
      setNotice({ type: 'success', message: text.settingsSaved });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || text.languageSaveFailed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={text.settings} text={text} notice={notice}>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="preferred-language">{text.languageSetting}</label>
        <select
          id="preferred-language"
          value={selectedLanguage}
          onChange={(event) => setSelectedLanguage(event.target.value)}
        >
          <option value="en">{text.english}</option>
          <option value="es">{text.spanish}</option>
        </select>
        <button className="primary-link" type="submit" disabled={busy}>
          {busy ? text.saving : text.saveSettings}
        </button>
      </form>
      <p className="form-footnote"><a href="/workspaces">{text.backToWorkspaces}</a></p>
    </AuthCard>
  );
}

function AuthCard({ title, text, notice, children }) {
  return (
    <section className="auth-card">
      <p className="eyebrow">HANDY SYSTEM</p>
      <h1 className="auth-title">{title}</h1>
      <Notice notice={notice} />
      {children}
    </section>
  );
}

export function App() {
  const [language, setLanguage] = useState(detectInitialLanguage);
  const [account, setAccount] = useState(null);
  const text = copy[language];
  const route = window.location.pathname.replace(/\/+$/u, '') || '/';
  const workspaceMatch = route.match(/^\/workspaces\/([^/]+)$/u);
  const propertyDetailMatch = route.match(/^\/workspaces\/([^/]+)\/properties\/([^/]+)$/u);
  const crmCollectionMatch = route.match(/^\/workspaces\/([^/]+)\/(customers|property-managers|properties)$/u);
  const requestCollectionMatch = route.match(/^\/workspaces\/([^/]+)\/requests$/u);
  const estimateCollectionMatch = route.match(/^\/workspaces\/([^/]+)\/estimates$/u);
  const workOrderCollectionMatch = route.match(/^\/workspaces\/([^/]+)\/work-orders$/u);
  const employeeCollectionMatch = route.match(/^\/workspaces\/([^/]+)\/employees$/u);
  const needsOwnerSession = route === '/workspaces'
    || route === '/settings'
    || Boolean(workspaceMatch || propertyDetailMatch || crmCollectionMatch || requestCollectionMatch || estimateCollectionMatch || workOrderCollectionMatch || employeeCollectionMatch);

  useEffect(() => {
    if (!needsOwnerSession) {
      setAccount(null);
      return undefined;
    }

    let active = true;
    fetch('/api/auth/session')
      .then(async (response) => {
        if (!response.ok) throw new Error('Session unavailable');
        return response.json();
      })
      .then(({ data }) => {
        if (!active) return;
        setAccount(data);
        if (data.preferredLanguage === 'en' || data.preferredLanguage === 'es') {
          setLanguage(data.preferredLanguage);
          window.localStorage.setItem('handy-language', data.preferredLanguage);
        }
      })
      .catch(() => {
        if (active) setAccount(null);
      });

    return () => { active = false; };
  }, [route, needsOwnerSession]);

  function updateLocalLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setAccount((current) => current ? { ...current, preferredLanguage: nextLanguage } : current);
    window.localStorage.setItem('handy-language', nextLanguage);
  }

  let page;
  switch (route) {
    case '/register': page = <RegisterPage text={text} language={language} />; break;
    case '/login': page = <LoginPage text={text} />; break;
    case '/verify-email': page = <VerifyEmailPage text={text} />; break;
    case '/forgot-password': page = <ForgotPasswordPage text={text} />; break;
    case '/reset-password': page = <ResetPasswordPage text={text} />; break;
    case '/estimates/accept': page = <EstimateAcceptancePage text={text} />; break;
    case '/assigned-work-order': page = <AssignedWorkOrderPage text={text} />; break;
    case '/appointment-response': page = <AppointmentResponsePage text={text} />; break;
    case '/workspaces': page = <WorkspacesPage text={text} />; break;
    case '/settings': page = <SettingsPage text={text} language={account?.preferredLanguage ?? language} onLanguageSaved={updateLocalLanguage} />; break;
    default:
      if (propertyDetailMatch) {
        page = <PropertyDetailPage
          text={text}
          workspaceId={decodeURIComponent(propertyDetailMatch[1])}
          propertyId={decodeURIComponent(propertyDetailMatch[2])}
        />;
      } else if (requestCollectionMatch) {
        page = <ServiceRequestsPage text={text} workspaceId={decodeURIComponent(requestCollectionMatch[1])} />;
      } else if (estimateCollectionMatch) {
        page = <EstimatesPage text={text} workspaceId={decodeURIComponent(estimateCollectionMatch[1])} />;
      } else if (workOrderCollectionMatch) {
        page = <WorkOrdersPage text={text} workspaceId={decodeURIComponent(workOrderCollectionMatch[1])} />;
      } else if (employeeCollectionMatch) {
        page = <EmployeePage text={text} workspaceId={decodeURIComponent(employeeCollectionMatch[1])} />;
      } else if (crmCollectionMatch) {
        page = <CrmCollectionPage
          text={text}
          workspaceId={decodeURIComponent(crmCollectionMatch[1])}
          module={crmCollectionMatch[2]}
        />;
      } else if (workspaceMatch) {
        page = <WorkspaceDetailPage text={text} workspaceId={decodeURIComponent(workspaceMatch[1])} />;
      } else {
        page = <Landing text={text} />;
      }
  }

  return <Shell text={text} language={language} setLanguage={updateLocalLanguage} isOwner={Boolean(account)}>{page}</Shell>;
}
