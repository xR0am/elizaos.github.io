import { SQL, sql, or } from "drizzle-orm";
import { DateRange } from "../data/types";

/**
 * Helper function to build date range conditions for different date fields
 */
export function buildDateRangeConditions<T extends { [key: string]: unknown }>(
  dateRange: DateRange,
  table: T,
  dateFields: (keyof T)[],
): SQL[] {
  if (!dateRange) return [];

  const { startDate, endDate } = dateRange;
  let dateConditions: SQL[] = [];
  if (startDate && endDate) {
    dateConditions = dateFields.map(
      (field) =>
        sql`${table[field]} >= ${startDate} AND ${table[field]} <= ${endDate}`,
    );
  } else if (startDate) {
    dateConditions = dateFields.map(
      (field) => sql`${table[field]} >= ${startDate}`,
    );
  } else if (endDate) {
    dateConditions = dateFields.map(
      (field) => sql`${table[field]} <= ${endDate}`,
    );
  }

  // At least one date field should match the range
  return [sql`(${or(...dateConditions)})`];
} /**
 * Helper function to build common where conditions based on query params
 */
export function buildCommonWhereConditions<
  T extends { createdAt?: unknown; repository?: unknown },
>(
  params: QueryParams,
  table: T,
  dateFields: (keyof T)[] = ["createdAt"],
): SQL[] {
  const conditions: SQL[] = [];

  if (params.dateRange) {
    conditions.push(
      ...buildDateRangeConditions(params.dateRange, table, dateFields),
    );
  }

  if (params.repository) {
    conditions.push(sql`${table.repository} = ${params.repository}`);
  }

  return conditions;
}
export interface PaginatedQueryParams extends QueryParams {
  // Pagination
  limit?: number;
  offset?: number;
} /**
 * Standard query parameters used across different queries
 */

export interface QueryParams {
  dateRange?: DateRange;
  repository?: string;
}
