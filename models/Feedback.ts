import * as eta from "../eta";
import * as orm from "typeorm";
import User from "../../cre-db-shared/models/User";

/**
 * User-submitted feedback through various modals
 */
@orm.Entity()
export default class Feedback {
    @orm.PrimaryGeneratedColumn()
    public id: number;

    @orm.Column()
    public text: string;

    @eta.orm.TimezoneColumn()
    public created: Date = new Date();

    @orm.ManyToOne(() => User)
    public author: User;
}
