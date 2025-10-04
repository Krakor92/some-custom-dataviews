export type Blueprint<T, M> = (data: T, context?: any) => M;
export type AsyncBlueprint<T, M> = (data: T, context?: any) => Promise<M>;

export class Factory<T, M> {
  constructor(private blueprint: Blueprint<T, M>) { }

  /**
   * @param data - Data to transform by the blueprint
   * @param context - Context potentially needed by the blueprint to convert the data
   */
  create(data: T, context?: any): M {
    return this.blueprint(data, context);
  }
}
