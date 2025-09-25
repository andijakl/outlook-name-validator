/**
 * Office.js integration layer exports
 */

export { 
  OutlookIntegration, 
  OfficeIntegration, 
  ValidationEventHandler 
} from './office-integration';

export { 
  ValidationOrchestratorImpl, 
  ValidationOrchestrator, 
  OrchestratorEventHandler 
} from './validation-orchestrator';

export { 
  OfficeErrorHandler,
  OfficeIntegrationError,
  ValidationError,
  PermissionError,
  ApiUnavailableError
} from './error-handler';