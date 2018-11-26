import * as eta from "@eta/eta";
import * as db from "@eta/db";
import * as events from "events";
import * as orm from "typeorm";

export default class Seeder extends events.EventEmitter {
    public db: db.RepositoryManager;
    public actions: SeederAction[];
    public rows: {} = {};

    public get startDate(): Date {
        const now = new Date();
        return new Date(now.getFullYear() - 5, 0, 1);
    }

    public get endDate(): Date {
        const now = new Date();
        return new Date(now.getFullYear() + 5, 11, 31);
    }

    public constructor(db: db.RepositoryManager, actions: SeederAction[]) {
        super();
        this.db = db;
        this.actions = actions;
    }

    public async start(): Promise<void> {
        for (const action of this.actions) {
            await action(this);
        }
        this.emit("end");
    }

    public async seed<T>(repository: orm.Repository<T>, items: T[],
        transformer: (query: orm.SelectQueryBuilder<T>) => typeof query = qb => qb,
        dump?: (repository: orm.Repository<T>, items: T[]) => Promise<any>
    ): Promise<void> {
        const typeName: string = typeof repository.target === "string" ? repository.target : repository.target.name;
        await (dump ? dump(repository, items) : eta.EntityCache.dumpMany(repository, items, false));
        const insertedItems: T[] = await transformer(repository.createQueryBuilder("entity")).getMany();
        (<any>this.rows)[typeName] = insertedItems;
        this.emit("progress", {
            typeName,
            count: insertedItems.length
        });
    }

    // utilities
    public getRandomDatePair(start = this.startDate, end = this.endDate, sameDay = false): { start: Date, end: Date } {
        let pair: { start: Date, end: Date };
        do {
            pair = {
                start: this.getRandomDate(start, end),
                end: this.getRandomDate(start, end)
            };
            if (sameDay) {
                pair.start.setFullYear(pair.end.getFullYear());
                pair.start.setMonth(pair.end.getMonth());
                pair.start.setDate(pair.end.getDate());
                pair.start = this.randomizeTime(pair.start);
                do {
                    pair.end = this.randomizeTime(pair.end);
                } while (pair.end.getTime() <= pair.start.getTime());
            }
        } while (pair.end.getTime() < pair.start.getTime());
        return pair;
    }

    public getRandomDate(start = this.startDate, end = this.endDate): Date {
        return new Date(
            eta._.random(start.getUTCFullYear(), end.getUTCFullYear()),
            eta._.random(start.getUTCMonth(), end.getUTCMonth()),
            eta._.random(start.getUTCDate(), end.getUTCDate())
        );
    }

    public randomizeTime(date: Date): Date {
        date.setHours(eta._.random(0, 24));
        date.setMinutes(eta._.random(0, 60));
        date.setSeconds(eta._.random(0, 60));
        return date;
    }

    public getRandomItem<T>(items: T[], allowUndefined = false): T {
        return items[eta._.random(0, items.length - (allowUndefined ? 0 : 1))];
    }

    public getRandomEnum(type: {[key: string]: any}): number {
        return this.getRandomItem(Object.values(type)
            .filter(n => !isNaN(n)));
    }

    public getMapping<T>(items: T[], generateKey: (entity: T) => string): {[key: string]: T} {
        const mapping: {[key: string]: T} = {};
        for (const item of items) {
            mapping[generateKey(item)] = item;
        }
        return mapping;
    }
}

type SeederAction = (seeder: Seeder) => Promise<void>;
