const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Cerrajería JMG',
            version: '1.0.0',
            description: 'Backend Cerrajería JMG Project'
        }
    },
    apis: [
        path.join(__dirname, '../routes/**/*.js'),
        path.join(__dirname, '../controllers/**/*.js')
    ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;