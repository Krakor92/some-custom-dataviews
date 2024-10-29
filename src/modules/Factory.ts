export type Blueprint<T, M> = (data: T) => M;
export type AsyncBlueprint<T, M> = (data: T) => Promise<M>;

export class Factory<T, M> {
  constructor(private blueprint: Blueprint<T, M>) {}

  create(data: T): M {
    return this.blueprint(data);
  }
}
