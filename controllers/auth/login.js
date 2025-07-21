import mysql2 from "mysql2";
import jwt from "jsonwebtoken";
import CustomException from "../../models/custom_exception.js";
import { Status } from "../../models/status.js";
import { executeQuery, getDbConfig } from "../../db.js";

function generateToken(userId, idEmpresa, perfil) {
    const payload = { userId, perfil, idEmpresa };
    const options = { expiresIn: "2558h" };
    return jwt.sign(payload, "ruteate", options);
}

export async function login(username, password, company) {
    const dbConfig = getDbConfig(company.did);
    const dbConnection = mysql2.createConnection(dbConfig);
    dbConnection.connect();

    const [userRow] = await executeQuery(
        'SELECT id, nombre, email, password FROM usuarios WHERE email = ? AND eliminado = 0 LIMIT 1',
        [username],
        true
    );
    if (!userRow) {
        throw new CustomException({
            title: 'Credenciales inválidas',
            message: 'Email o contraseña incorrectos',
            status: Status.notFound
        });
    }

    const incomingHash = generateToken(password);

    if (incomingHash !== userRow.password) {
        throw new CustomException({
            title: 'Credenciales inválidas',
            message: 'Email o contraseña incorrectos',
            status: Status.unauthorized
        });
    }
    const token = generateToken(username, password, company)

    const { id, nombre, email: mail } = userRow;

    return {
        id: id, token, nombre, email: mail,
    };
}
