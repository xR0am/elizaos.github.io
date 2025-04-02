import { PipelineConfig } from "../types";
import { QueryParams } from "../queries";
import { Logger } from "./logger";

// Generic base context interface that can be extended by specific pipelines
export interface BaseProcessingContext {
  // Base context - deliberately empty, to be extended by specific contexts
}

export interface ProcessingResult<T = unknown> {
  data: T;
  updates?: Record<string, any>;
  stats?: Record<string, any>; // Statistics about what was processed
}

export interface ProcessingStep<
  TContext extends BaseProcessingContext = BaseProcessingContext,
  TOutput = unknown
> {
  name: string;
  process(
    context: TContext,
    queryParams: QueryParams,
    config: PipelineConfig
  ): Promise<ProcessingResult<TOutput>>;
}

// Composition helpers for processing steps
export type StepComposition<
  TContext extends BaseProcessingContext,
  TIntermediate,
  TOutput
> = {
  first: ProcessingStep<TContext, TIntermediate>;
  second: ProcessingStep<TContext, TOutput>;
};

export function composeSteps<
  TContext extends BaseProcessingContext,
  TIntermediate,
  TOutput
>(
  first: ProcessingStep<TContext, TIntermediate>,
  second: ProcessingStep<TContext, TOutput>
): ProcessingStep<TContext, TOutput> {
  return {
    name: `${first.name} → ${second.name}`,
    async process(
      context,
      queryParams,
      config
    ): Promise<ProcessingResult<TOutput>> {
      const firstResult = await first.process(context, queryParams, config);

      // Pass the context to the second step
      const secondResult = await second.process(context, queryParams, config);

      return {
        data: secondResult.data,
        updates: {
          ...(firstResult.updates || {}),
          ...(secondResult.updates || {}),
        },
      };
    },
  };
}

export function parallelSteps<
  TContext extends BaseProcessingContext,
  T extends ProcessingStep<TContext, any>[]
>(
  baseContext: TContext,
  steps: [...T]
): ProcessingStep<
  TContext,
  { [K in keyof T]: T[K] extends ProcessingStep<TContext, infer R> ? R : never }
> {
  return {
    name: steps.map((step) => step.name).join(" + "),
    async process(context, queryParams, config) {
      const results = await Promise.all(
        steps.map((step) => step.process(context, queryParams, config))
      );

      // Combine all updates
      const updates = results.reduce((acc, result) => {
        return result.updates ? { ...acc, ...result.updates } : acc;
      }, {});

      // Data from all steps as a tuple
      const data = results.map((result) => result.data) as any;

      return {
        data,
        updates,
      };
    },
  };
}
