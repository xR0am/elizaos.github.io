import { createStep, RepoPipelineContext } from "./types";
import {
  IntervalType,
  TimeInterval,
  toDateString,
  toUTCMidnight,
} from "../../date-utils";
import { addDays, addMonths } from "date-fns";
import { UTCDate } from "@date-fns/utc";

/**
 * Creates a pipeline step to generate time intervals for a repository with a specific interval type
 */
export const generateTimeIntervals = <TInput extends Record<string, unknown>>(
  intervalType: IntervalType,
) =>
  createStep<
    TInput,
    Array<TInput & { interval: TimeInterval }>,
    RepoPipelineContext
  >(
    "generateTimeIntervals",
    async (input: TInput, { dateRange, logger }: RepoPipelineContext) => {
      if (!dateRange) {
        throw new Error("dateRange is required for interval generation");
      }

      logger?.debug("Generating time intervals", {
        dateRange,
        intervalType,
      });
      const intervals: TimeInterval[] = [];

      // Convert dates to UTC midnight and adjust based on interval type
      let start: UTCDate;
      let end: UTCDate;

      switch (intervalType) {
        case "day":
          start = toUTCMidnight(new UTCDate(dateRange.startDate));
          end = dateRange.endDate
            ? addDays(toUTCMidnight(new UTCDate(dateRange.endDate)), 1)
            : addDays(toUTCMidnight(new UTCDate()), 1);
          break;

        case "week": {
          // Get start of week (Sunday) for the start date
          const startDate = toUTCMidnight(new UTCDate(dateRange.startDate));
          start = addDays(startDate, -startDate.getUTCDay());

          // Get first day of next week after the end date
          const rawEnd = dateRange.endDate
            ? toUTCMidnight(new UTCDate(dateRange.endDate))
            : toUTCMidnight(new UTCDate());
          const daysUntilNextWeek = 7 - rawEnd.getUTCDay();
          end = addDays(rawEnd, daysUntilNextWeek);
          break;
        }

        case "month": {
          // Start from first day of the start month
          const startDate = new UTCDate(dateRange.startDate);
          start = new UTCDate(
            Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
          );

          // End at the first day of the month after the end date
          const rawEnd = dateRange.endDate
            ? new UTCDate(dateRange.endDate)
            : new UTCDate();
          end = addMonths(
            new UTCDate(
              Date.UTC(rawEnd.getUTCFullYear(), rawEnd.getUTCMonth(), 1),
            ),
            1,
          );

          break;
        }

        default:
          throw new Error(`Unsupported interval type: ${intervalType}`);
      }

      let currentStart = new UTCDate(start);

      // Handle single-day case
      if (currentStart.getTime() === end.getTime()) {
        const interval: TimeInterval = {
          intervalStart: currentStart,
          intervalEnd: end,
          intervalType,
        };
        intervals.push(interval);
        logger?.debug(`Generated single interval`, {
          intervalType,
          dateRange,
          interval,
        });
        return intervals.map((interval) => ({ ...input, interval }));
      }

      while (currentStart < end) {
        let intervalEnd: UTCDate;

        switch (intervalType) {
          case "day":
            intervalEnd = addDays(currentStart, 1);
            break;

          case "week":
            intervalEnd = addDays(currentStart, 7);
            break;

          case "month":
            intervalEnd = addMonths(currentStart, 1);
            break;

          default:
            throw new Error(`Unsupported interval type: ${intervalType}`);
        }

        const interval: TimeInterval = {
          intervalStart: currentStart,
          intervalEnd,
          intervalType,
        };
        intervals.push(interval);

        // Move to next interval start
        currentStart = intervalEnd;
      }

      logger?.debug(`Generated ${intervals.length} intervals`, {
        intervals: intervals.map((interval) => ({
          intervalStart: toDateString(interval.intervalStart),
          intervalEnd: toDateString(interval.intervalEnd),
        })),
      });

      return intervals.map((interval) => ({ ...input, interval }));
    },
  );
