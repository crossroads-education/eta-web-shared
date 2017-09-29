import * as orm from "typeorm";
import User from "../../cre-db-shared/models/User";

/**
 * User-submitted feedback through various modals
 */
@orm.Entity()
export default class Feedback {
    @orm.PrimaryGeneratedColumn()
    public id: number;

    @orm.Column({ type: "text", nullable: false })
    public text: string;

    @orm.Column({ type: "timestamp with time zone", nullable: false, default: "NOW()" })
    public created: Date = new Date();

    @orm.ManyToOne(t => User, { nullable: false })
    public author: User;
}
