import CustomException from "../../models/custom_exception.js";
import { Status } from "../../models/status.js";
import { executeQuery } from "../../db.js";
import crypto from "crypto";
import { logYellow } from "../../src/logCustom.js";

export async function login(conn, username, password) {

    const query = 'SELECT id, nombre, mail, pass, usuario FROM usuarios WHERE usuario = ? AND elim = 0 AND superado = 0 LIMIT 1';
    const [userRow] = await executeQuery(conn, query, [username]);

    if (!userRow) {
        throw new CustomException({
            title: 'Credenciales inválidas',
            message: 'Email o contraseña incorrectos',
            status: Status.notFound
        });
    }

    const hashPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

    logYellow(`Hash de la contraseña: ${hashPassword}`);
    logYellow(`Usuario: ${userRow.password}`);

    if (userRow.pass !== hashPassword) {
        throw new CustomException({
            title: "Contraseña incorrecta",
            message: "La contraseña ingresada no coincide",
            status: Status.unauthorized
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
