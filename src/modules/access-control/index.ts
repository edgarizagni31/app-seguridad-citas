export { AddVisitorScreen } from './presentation/screens/add-visitor-screen';
export { EntryConfirmedScreen } from './presentation/screens/entry-confirmed-screen';
export { GateConfirmedScreen } from './presentation/screens/gate-confirmed-screen';
export { GateModeScreen } from './presentation/screens/gate-mode-screen';
export { GatePeopleScreen } from './presentation/screens/gate-people-screen';
export { GatePersonScreen } from './presentation/screens/gate-person-screen';
export { GateUnitScreen } from './presentation/screens/gate-unit-screen';
export { GateUnitsScreen } from './presentation/screens/gate-units-screen';
export { GateVisitorsScreen } from './presentation/screens/gate-visitors-screen';
export { GateHomeScreen } from './presentation/screens/gate-home-screen';
export { VehicleLookupScreen } from './presentation/screens/vehicle-lookup-screen';
export { VehicleScanScreen } from './presentation/screens/vehicle-scan-screen';
export { VisitorsScreen } from './presentation/screens/visitors-screen';
// Reutilizados por la inspección (HSE): escanear el QR de la cita y elegir la placa
export type { GateAppointment, GateUnit } from './domain';
export { PlateBadge } from './presentation/components/plate-badge';
export { gateErrorMessage } from './presentation/mappers/gate-text';
export { QrScanScreen, type QrScanTexts } from './presentation/screens/vehicle-scan-screen';
