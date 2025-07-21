import mysql2 from "mysql2";
import { executeQuery, getProdDbConfig } from "../../db.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { logRed } from "../../src/funciones/logsCustom.js";
import CustomException from "../../classes/custom_exception.js";
import { Status } from "../../models/status.js";

function generateToken(userId, idEmpresa, perfil) {
    const payload = { userId, perfil, idEmpresa };
    const options = { expiresIn: "2558h" };
    return jwt.sign(payload, "ruteate", options);
}

export async function login(username, password, company) {
    const dbConfig = getProdDbConfig(company);
    const dbConnection = mysql2.createConnection(dbConfig);
    dbConnection.connect();

    const [userRow] = await executeQuery(
        'SELECT id, nombre, email, password FROM usuarios WHERE email = ? AND eliminado = 0 LIMIT 1',
        [email],
        true
    );
    if (!userRow) {
        throw new CustomException({
            title: 'Credenciales inválidas',
            message: 'Email o contraseña incorrectos',
            status: Status.notFound
        });
    }

    //console.log('→ loginUser:', { email, password, userRow });

    // 2) Compara hash SHA-256
    const incomingHash = hash256(password);
    //console.log('→ incomingHash:', incomingHash, 'storedHash:', userRow.password);
    if (incomingHash !== userRow.password) {
        throw new CustomException({
            title: 'Credenciales inválidas',
            message: 'Email o contraseña incorrectos',
            status: Status.unauthorized
        });
    }

    // 3) Genera JWT
    const token = jwt.sign({ sub: userRow.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 2) Hashear la contraseña que envía el cliente


    // 4) Devuelve token + datos de usuario (sin el hash)
    const { id, nombre, email: mail } = userRow;
    return {
        id: id, token, nombre, email: mail,
    };
}
