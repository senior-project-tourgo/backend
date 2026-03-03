const swaggerJsDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Trip Planner API',
            version: '1.0.0',
            description: 'API for managing trips, places, and recommendations',
            contact: {
                name: 'Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Bearer token for protected routes',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'John Doe' },
                        username: { type: 'string', example: 'johndoe' },
                        email: { type: 'string', nullable: true, example: 'john@example.com' },
                        phoneNumber: { type: 'string', nullable: true, example: '+1234567890' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Login successful' },
                        data: {
                            type: 'object',
                            properties: {
                                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                user: { $ref: '#/components/schemas/User' },
                            },
                        },
                    },
                },
                Place: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'Eiffel Tower' },
                        location: {
                            type: 'object',
                            properties: {
                                area: { type: 'string', example: 'Paris' },
                                latitude: { type: 'number', example: 48.8584 },
                                longitude: { type: 'number', example: 2.2945 },
                            },
                        },
                        vibe: { type: 'array', items: { type: 'string' }, example: ['historic', 'romantic'] },
                        averageRating: { type: 'number', example: 4.5 },
                        priceRange: { type: 'string', example: '$$', enum: ['$', '$$', '$$$', '$$$$'] },
                        isActive: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Trip: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
                        userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        itineraryName: { type: 'string', example: 'Paris Summer 2026' },
                        places: { type: 'array', items: { type: 'string' }, example: ['Swayambhunath'] },
                        status: { type: 'string', enum: ['current', 'completed'], example: 'current' },
                        startedAt: { type: 'string', format: 'date-time', nullable: true },
                        completedAt: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Error message' },
                        error: { type: 'string', nullable: true },
                    },
                },
            },
        },
        security: [],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
