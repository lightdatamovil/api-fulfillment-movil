import { Status } from '../../models/status.js';
import { logRed } from '../../src/logCustom.js';
import CustomException from '../../models/custom_exception.js';

export async function identification(company) {

    if (!company || company.did === undefined) {
        const error = new CustomException({
            title: 'Error en identificación',
            message: 'ID de compañía no definido',
            status: Status.internalServerError
        });
        logRed(`Error en identification: ${error.stack}`);
        throw error;
    }

    const result = {
        id: company.did * 1,
        image: ''
        // plan: company.plan * 1,
        // url: company.url,
        // country: company.pais * 1,
        // name: company.empresa,
    };

    return result;
}

