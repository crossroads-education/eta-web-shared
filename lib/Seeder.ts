import * as eta from "../eta";
import * as db from "../db";
import * as orm from "typeorm";
import * as pg from "pg";

export default class Seeder {
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
        this.db = db;
        this.actions = actions;
    }

    public async start(): Promise<void> {
        for (const action of this.actions) {
            await action(this);
        }
        const insertedRowsCount = Object.keys(this.rows)
            .map(k => (<any>this.rows)[k].length)
            .reduce((p, v) => p + v, 0);
        eta.logger.info(`Finished seeding database. Inserted ${insertedRowsCount} rows.`);
    }

    public async seed<T>(repository: orm.Repository<T>, items: T[], transformer: (query: orm.SelectQueryBuilder<T>) => orm.SelectQueryBuilder<T> = qb => qb): Promise<void> {
        const typeName: string = typeof repository.target === "string" ? repository.target : repository.target.name;
        await eta.EntityCache.dumpMany(repository, items, false);
        const insertedItems: T[] = await transformer(repository.createQueryBuilder("entity")).getMany();
        (<any>this.rows)[typeName] = insertedItems;
        eta.logger.trace(`Seeded ${typeName} with ${insertedItems.length} rows.`);
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
            }
        } while (pair.end.getTime() < pair.start.getTime());
        return pair;
    }

    public getRandomDate(start = this.startDate, end = this.endDate): Date {
        return new Date(
            eta._.random(start.getFullYear(), end.getFullYear()),
            eta._.random(start.getMonth(), end.getMonth()),
            eta._.random(start.getDate(), end.getDate())
        );
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

interface SeederAction {
    (seeder: Seeder): Promise<void>;
}
