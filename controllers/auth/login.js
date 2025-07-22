import CustomException from "../../models/custom_exception.js";
import { Status } from "../../models/status.js";
import { executeQuery } from "../../db.js";
import crypto from "crypto";
import { logYellow } from "../../src/logCustom.js";

export async function login(conn, username, password) {

    const query = 'SELECT id, nombre, mail, pass FROM usuarios WHERE mail = ? AND elim = 0 LIMIT 1';
    const [userRow] = await executeQuery(conn, query, [username]);

    const hashPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

    logYellow(`Hash de la contraseña: ${hashPassword}`);
    logYellow(`Usuario: ${userRow.password}`);

    if (userRow.password !== hashPassword) {
        throw new CustomException({
            title: "Contraseña incorrecta",
            message: "La contraseña ingresada no coincide",
        });
    }
    if (!userRow) {
        throw new CustomException({
            title: 'Credenciales inválidas',
            message: 'Email o contraseña incorrectos',
            status: Status.notFound
        });
    }


    const { id, nombre, email: mail } = userRow;

    return {
        id,
        nombre,
        email: mail,
    };
}
