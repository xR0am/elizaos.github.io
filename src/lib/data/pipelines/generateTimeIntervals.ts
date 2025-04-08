import { createStep, RepoPipelineContext } from "./types";
import { IntervalType, TimeInterval, toUTCMidnight } from "../../date-utils";
import { addDays, addMonths } from "date-fns";

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

      // Convert dates to UTC midnight
      const start = toUTCMidnight(dateRange.startDate);
      const end = dateRange.endDate
        ? toUTCMidnight(dateRange.endDate)
        : toUTCMidnight(new Date());

      let currentStart = new Date(start);

      // If start and end are the same date, create a single interval
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
        let intervalEnd: Date;

        switch (intervalType) {
          case "day":
            // Add a day using date-fns
            intervalEnd = addDays(currentStart, 1);
            break;

          case "week":
            // Add a week using date-fns
            intervalEnd = addDays(currentStart, 7 - currentStart.getUTCDay());
            break;

          case "month":
            // Set to first day of next month in UTC using date-fns
            intervalEnd = addMonths(
              new Date(
                Date.UTC(
                  currentStart.getUTCFullYear(),
                  currentStart.getUTCMonth(),
                  1,
                ),
              ),
              1,
            );
            break;
        }

        // Don't exceed the overall end date
        if (intervalEnd > end) {
          intervalEnd = new Date(end);
        }

        const interval: TimeInterval = {
          intervalStart: currentStart,
          intervalEnd: intervalEnd,
          intervalType,
        };
        logger?.trace("Generated interval", {
          interval,
        });
        intervals.push(interval);

        // Move to next interval start
        currentStart = new Date(intervalEnd);

        // Break if we've reached the end to prevent infinite loops
        if (currentStart.getTime() >= end.getTime()) {
          break;
        }
      }

      logger?.debug(`Generated ${intervals.length} intervals`, {
        intervalType,
        dateRange,
      });

      const res = intervals.map((interval) => ({ ...input, interval }));

      return res;
    },
  );
