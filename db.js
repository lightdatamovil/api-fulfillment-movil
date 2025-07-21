import redis from 'redis';
import dotenv from 'dotenv';
import mysql2 from 'mysql2';
import { logRed, logYellow } from './src/logCustom.js';
dotenv.config({ path: process.env.ENV_FILE || ".env" });

/// Redis para obtener las empresas
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;

/// Base de datos de API_FF_MOVI
const API_FF_MOVIDBHost = process.env.API_FF_MOVI_DB_HOST;
const API_FF_MOVIDBUser = process.env.API_FF_MOVI_DB_USER;
const API_FF_MOVIDBPassword = process.env.API_FF_MOVI_DB_PASSWORD;
const API_FF_MOVIDBName = process.env.API_FF_MOVI_DB_NAME;
const API_FF_MOVIDBPort = process.env.API_FF_MOVI_DB_PORT;

/// Usuario y contraseña para los logs de la base de datos de API_FF_MOVI
const API_FF_MOVIDbUserForLogs = process.env.API_FF_MOVI_DB_USER_FOR_LOGS;
const API_FF_MOVIDbPasswordForLogs = process.env.API_FF_MOVI_DB_PASSWORD_FOR_LOGS;
const API_FF_MOVIDbNameForLogs = process.env.API_FF_MOVI_DB_NAME_FOR_LOGS;

export const redisClient = redis.createClient({
    socket: {
        host: redisHost,
        port: redisPort,
    },
    password: redisPassword,
});

redisClient.on('error', (error) => {
    logRed(`Error al conectar con Redis: ${error.stack}`);
});

let companiesList = {};

let accountList = {};
let driverList = {};
let zoneList = {};
let clientList = {};

export function getDbConfig(companyId) {
    return {
        host: API_FF_MOVIDBHost,
        user: API_FF_MOVIDBUser + companyId,
        password: API_FF_MOVIDBPassword + companyId,
        database: API_FF_MOVIDBName,
        port: API_FF_MOVIDBPort
    };
}

export const poolLocal = mysql2.createPool({
    host: API_FF_MOVIDBHost,
    user: API_FF_MOVIDbUserForLogs,
    password: API_FF_MOVIDbPasswordForLogs,
    database: API_FF_MOVIDbNameForLogs,
    port: API_FF_MOVIDBPort,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function updateRedis(empresaId, envioId, choferId) {
    const DWRTE = await redisClient.get('DWRTE',);
    const empresaKey = `e.${empresaId}`;
    const envioKey = `en.${envioId}`;

    // Si la empresa no existe, la creamos
    if (!DWRTE[empresaKey]) {
        DWRTE[empresaKey] = {};
    }

    // Solo agrega si el envío no existe
    if (!DWRTE[empresaKey][envioKey]) {
        DWRTE[empresaKey][envioKey] = {
            choferId: choferId
        };
    }

    await redisClient.set('DWRTE', JSON.stringify(DWRTE));
}

async function loadCompaniesFromRedis() {
    try {
        const companiesListString = await redisClient.get('empresasData');

        companiesList = JSON.parse(companiesListString);

    } catch (error) {
        logRed(`Error en loadCompaniesFromRedis: ${error.stack}`);
        throw error;
    }
}

export async function getCompanyById(companyId) {
    try {
        let company = companiesList[companyId];

        if (company == undefined || Object.keys(companiesList).length === 0) {
            try {
                await loadCompaniesFromRedis();

                company = companiesList[companyId];
            } catch (error) {
                logRed(`Error al cargar compañías desde Redis: ${error.stack}`);
                throw error;
            }
        }

        return company;
    } catch (error) {
        logRed(`Error en getCompanyById: ${error.stack}`);
        throw error;
    }
}

export async function getCompanyByCode(companyCode) {
    try {
        let company;

        if (Object.keys(companiesList).length === 0) {
            try {
                await loadCompaniesFromRedis();
            } catch (error) {
                logRed(`Error al cargar compañías desde Redis: ${error.stack}`);
                throw error;
            }
        }

        for (const key in companiesList) {
            if (Object.prototype.hasOwnProperty.call(companiesList, key)) {
                const currentCompany = companiesList[key];
                if (String(currentCompany.codigo) === String(companyCode)) {
                    company = currentCompany;
                    break;
                }
            }
        }

        return company;
    } catch (error) {
        logRed(`Error en getCompanyByCode: ${error.stack}`);
        throw error;
    }
}

async function loadAccountList(dbConnection, companyId, senderId) {
    try {
        const querySelectClientesCuentas = `
            SELECT did, didCliente, ML_id_vendedor 
            FROM clientes_cuentas 
            WHERE superado = 0 AND elim = 0 AND tipoCuenta = 1 AND ML_id_vendedor != ''
        `;

        const result = await executeQuery(dbConnection, querySelectClientesCuentas);

        if (!accountList[companyId]) {
            accountList[companyId] = {};
        }

        result.forEach(row => {
            const keySender = row.ML_id_vendedor;

            if (!accountList[companyId][keySender]) {
                accountList[companyId][keySender] = {};
            }

            accountList[companyId][keySender] = {
                didCliente: row.didCliente,
                didCuenta: row.did,
            };
        });

        return accountList[companyId] ? accountList[companyId][senderId] : null;
    } catch (error) {
        logRed(`Error en obtenerMisCuentas: ${error.stack}`);
        throw error;
    }
}

export async function getAccountBySenderId(dbConnection, companyId, senderId) {
    if (
        accountList === undefined ||
        accountList === null ||
        Object.keys(accountList).length === 0 ||
        !accountList[companyId]
    ) {
        await loadAccountList(dbConnection, companyId, senderId);
    }

    let account = accountList[companyId][senderId];

    if (account === undefined) {
        await loadAccountList(dbConnection, companyId, senderId);
        account = accountList[companyId][senderId];
    }

    return account;
}

async function loadClients(dbConnection, companyId) {
    if (!clientList[companyId]) {
        clientList[companyId] = {}
    }

    try {
        const queryUsers = "SELECT * FROM clientes";
        const resultQueryUsers = await executeQuery(dbConnection, queryUsers, []);

        resultQueryUsers.forEach(row => {
            const client = row.did;

            if (!clientList[companyId][client]) {
                clientList[companyId][client] = {};
            }

            clientList[companyId][client] = {
                fecha_sincronizacion: row.fecha_sincronizacion,
                did: row.did,
                codigo: row.codigoVinculacionLogE,
                nombre: row.nombre_fantasia,
            };
        });
    } catch (error) {
        logRed(`Error en loadClients para la compañía ${companyId}: ${error.stack}`);
        throw error;
    }
}

export async function getClientsByCompany(dbConnection, companyId) {
    try {
        let companyClients = clientList[companyId];

        if (companyClients == undefined || Object.keys(clientList).length === 0) {
            try {
                await loadClients(dbConnection, companyId);

                companyClients = clientList[companyId];
            } catch (error) {
                logRed(`Error al cargar compañías desde Redis: ${error.stack}`);
                throw error;
            }
        }

        return companyClients;
    } catch (error) {
        logRed(`Error en getClientsByCompany: ${error.stack}`);
        throw error;
    }
}

async function loadZones(dbConnection, companyId) {
    if (!zoneList[companyId]) {
        zoneList[companyId] = {}
    }

    try {
        const queryZones = "SELECT * FROM envios_zonas";
        const resultZones = await executeQuery(dbConnection, queryZones, []);

        resultZones.forEach(row => {
            const zone = row.did;

            if (!zoneList[companyId][zone]) {
                zoneList[companyId][zone] = {};
            }

            zoneList[companyId][zone] = {
                id: row.id,
                id_origen: row.id_origen,
                fecha_sincronizacion: row.fecha_sincronizacion,
                did: row.did,
                codigo: row.codigo,
                nombre: row.nombre,
                codigos: row.codigos,
                dataGeo: row.dataGeo,
            };
        });
    } catch (error) {
        logRed(`Error en loadZones para la compañía ${companyId}: ${error.stack}`);
        throw error;
    }
}

export async function getZonesByCompany(dbConnection, companyId) {
    try {
        let companyZones = zoneList[companyId];

        if (companyZones == undefined || Object.keys(zoneList).length === 0) {
            try {
                await loadZones(dbConnection, companyId);

                companyZones = zoneList[companyId];
            } catch (error) {
                logRed(`Error al cargar compañías desde Redis: ${error.stack}`);
                throw error;
            }
        }

        return companyZones;
    } catch (error) {
        logRed(`Error en getZonesByCompany: ${error.stack}`);
        throw error;
    }
}

async function loadDrivers(dbConnection, companyId) {
    if (!driverList[companyId]) {
        driverList[companyId] = {}
    }

    try {
        const queryUsers = `
            SELECT sistema_usuarios.did, sistema_usuarios.usuario 
            FROM sistema_usuarios_accesos
            INNER JOIN sistema_usuarios ON sistema_usuarios_accesos.did = sistema_usuarios.did
            WHERE sistema_usuarios_accesos.perfil IN (3, 6)
            AND sistema_usuarios_accesos.elim = 0
            AND sistema_usuarios_accesos.superado = 0
            AND sistema_usuarios.elim = 0
            AND sistema_usuarios.superado = 0
        `;

        const resultQueryUsers = await executeQuery(dbConnection, queryUsers, []);

        for (let i = 0; i < resultQueryUsers.length; i++) {
            const row = resultQueryUsers[i];

            if (!driverList[companyId][row.did]) {
                driverList[companyId][row.did] = {};
            }

            driverList[companyId][row.did] = {
                id: row.id,
                id_origen: row.id_origen,
                fecha_sincronizacion: row.fecha_sincronizacion,
                did: row.did,
                codigo: row.codigo_empleado,
                nombre: row.usuario,
            };
        }
    } catch (error) {
        logRed(`Error en loadDrivers para la compañía ${companyId}: ${error.stack}`);
        throw error;
    }
}

export async function getDriversByCompany(dbConnection, companyId) {
    try {
        let companyDrivers = driverList[companyId];

        if (companyDrivers == undefined || Object.keys(driverList).length === 0) {
            try {
                await loadDrivers(dbConnection, companyId);

                companyDrivers = driverList[companyId];
            } catch (error) {
                logRed(`Error al cargar compañías desde Redis: ${error.stack}`);
                throw error;
            }
        }

        return companyDrivers;
    } catch (error) {
        logRed(`Error en getDriversByCompany para la compañía ${companyId}: ${error.stack}`);
        throw error;
    }
}

export async function executeQuery(connection, query, values, log) {
    // Utilizamos connection.format para obtener la query completa con valores
    const formattedQuery = connection.format(query, values);

    try {
        return new Promise((resolve, reject) => {
            connection.query(query, values, (err, results) => {
                if (log) {
                    logYellow(`Ejecutando query: ${formattedQuery}`);
                }
                if (err) {
                    if (log) {
                        logRed(`Error en executeQuery: ${err.message} en query: ${formattedQuery}`);
                    }
                    reject(err);
                } else {
                    if (log) {
                        logYellow(`Query ejecutado con éxito: ${formattedQuery} - Resultados: ${JSON.stringify(results)}`);
                    }
                    resolve(results);
                }
            });
        });
    } catch (error) {
        logRed(`Error en executeQuery: ${error.stack}`);
        throw error;
    }
}
