import type { Database } from './database.types';

export type { Database };

type PublicSchema = Database['public'];

export type Tables<TableName extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][TableName]['Row'];

export type Enums<EnumName extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][EnumName];

export type StaffRole = Database['public']['Enums']['staff_role'];

export type BookingStatus = Database['public']['Enums']['booking_status'];
