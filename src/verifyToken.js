import jwt from 'jsonwebtoken';
import { logRed } from './logsCustom.js';

function verifyToken(req, res, next) {
    const token = req.headers.authorization;

    if (!token) {
        logRed('Token no proporcionado');
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    jwt.verify(token, 'ruteate', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.decoded = decoded;
        next();
    });
}

export default verifyToken;
