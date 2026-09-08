import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LOCAPAY Gestion des Stagiaires API",
      version: "3.1.0",
      description: "Documentation de l'API REST de l'application de gestion des stagiaires LOCAPAY",
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Serveur local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./apps/api/src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
