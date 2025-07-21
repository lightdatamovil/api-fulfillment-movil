import { Status } from '../models/status.js'
import { identification } from '../controllers/auth/identification.js';
import { verificarTodo } from '../src/verify_all.js';
import CustomException from '../models/custom_exception.js';
import { getCompanyByCode, getCompanyById } from '../db.js';
import { login } from '../controllers/auth/login.js';
import { logGreen, logPurple, logRed } from '../src/logCustom.js';
import { Router } from 'express';

const auth = Router();

auth.post('/company-identification', async (req, res) => {
    const startTime = performance.now();

    const { companyCode } = req.body;
    try {
        const errorMessage = verificarTodo(req, res, [], ['companyCode']);

        if (errorMessage) {
            logRed(`Error en company-identification: ${errorMessage}`);
            throw new CustomException({
                title: 'Error en identificacion de empresa',
                message: errorMessage
            });
        }

        const company = await getCompanyByCode(companyCode);
        const result = await identification(company);

        logGreen(`Empresa identificada correctamente`);
        res.status(Status.ok).json({ body: result, message: "Empresa identificada correctamente" });
    } catch (error) {
        if (error instanceof CustomException) {
            logRed(`Error 400 en login: ${error} `);
            res.status(Status.badRequest).json(error);
        } else {
            logRed(`Error 500 en login: ${error} `);
            res.status(Status.internalServerError).json({ title: 'Error interno del servidor', message: 'Unhandled Error', stack: error.stack });
        }
    } finally {
        const endTime = performance.now();
        logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
    }
});

auth.post('/login', async (req, res) => {
    const startTime = performance.now();

    const { username, password, companyId } = req.body;
    try {
        const mensajeError = verificarTodo(req, res, [], ['username', 'password', 'companyId']);

        if (mensajeError) {
            throw new CustomException({
                title: 'Error en login',
                message: mensajeError
            });
        }

        const company = await getCompanyById(companyId);
        const result = await login(username, password, company);

        logGreen(`Usuario logueado correctamente`);
        res.status(Status.ok).json({ body: result, message: "Usuario logueado correctamente" });
    } catch (error) {
        if (error instanceof CustomException) {
            logRed(`Error 400 en login: ${error} `);
            res.status(Status.badRequest).json({ title: error.title, message: error.message });
        } else {
            logRed(`Error 500 en login: ${error} `);
            res.status(Status.internalServerError).json({ message: 'Error interno del servidor' });
        }
    } finally {
        const endTime = performance.now();
        logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
    }
});

export default auth;
