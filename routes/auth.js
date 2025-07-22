import { Status } from '../models/status.js'
import { identification } from '../controllers/auth/identification.js';
import { verificarTodo } from '../src/verify_all.js';
import { getCompanyByCode, getDbConfig } from '../db.js';
import { login } from '../controllers/auth/login.js';
import { logGreen, logPurple } from '../src/logCustom.js';
import { Router } from 'express';
import mysql2 from 'mysql2';
import { handleError } from '../src/handle_error.js';

const auth = Router();

auth.post('/company-identification', async (req, res) => {
    const startTime = performance.now();
    try {
        verificarTodo(req, res, [], ['companyCode']);
        const { companyCode } = req.body;
        const company = await getCompanyByCode(companyCode);
        const result = await identification(company);
        logGreen(`Empresa identificada correctamente`);
        res.status(Status.ok).json({ body: result, message: "Empresa identificada correctamente" });
    } catch (error) {
        return handleError(req, res, error);
    } finally {
        const endTime = performance.now();
        logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
    }
});

auth.post('/login', async (req, res) => {
    const startTime = performance.now();

    const { username, password, companyId } = req.body;

    let connection;

    try {
        verificarTodo(req, res, [], ['username', 'password', 'companyId']);

        const dbConfig = getDbConfig(companyId);
        connection = mysql2.createConnection(dbConfig);
        connection.connect();

        const result = await login(connection, username, password);

        logGreen(`Usuario logueado correctamente`);
        res.status(Status.ok).json({ body: result, message: "Usuario logueado correctamente" });
    } catch (error) {
        return handleError(req, res, error);
    } finally {
        connection.end();
        const endTime = performance.now();
        logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
    }
});

export default auth;
