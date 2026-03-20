# Documentación de API con Swagger

## Resumen

Se ha implementado la generación de documentación automática para la API del microservicio de eventos (`service-events`) utilizando `drf-spectacular`, que genera una especificación OpenAPI (Swagger).

La tarea original era definir y documentar el modelo `TicketType`, pero se descubrió que el modelo, junto con sus serializadores y vistas, ya estaba implementado. Por lo tanto, el trabajo se centró en la parte de "documentar", exponiendo todos los endpoints de la API a través de una interfaz de usuario Swagger.

## Acceso a la Documentación

La documentación de la API está disponible en las siguientes rutas mientras el servidor de desarrollo está en ejecución:

- **Swagger UI**: [http://127.0.0.1:8002/api/v1/schema/swagger-ui/](http://127.0.0.1:8000/api/v1/schema/swagger-ui/)
- **ReDoc**: [http://127.0.0.1:8002/api/v1/schema/redoc/](http://127.0.0.1:8000/api/v1/schema/redoc/)

## Cambios Realizados

Para lograr esto, se realizaron los siguientes cambios:

1.  **`service-events/requirements.txt`**: Se añadió la dependencia `drf-spectacular` y su dependencia `PyYAML`.
2.  **`service-events/manage.py`**: Se corrigió la variable de entorno `DJANGO_SETTINGS_MODULE` para que apunte a la configuración correcta (`events_config.settings`).
3.  **`service-events/events_config/settings.py`**: 
    - Se agregó `drf_spectacular` a la lista de `INSTALLED_APPS`.
    - Se configuró `REST_FRAMEWORK` para usar `drf_spectacular.openapi.AutoSchema` como la clase de esquema por defecto.
    - Se añadieron los `SPECTACULAR_SETTINGS` para el título, descripción y versión de la API.
4.  **`service-events/events_config/urls.py`**: Se agregaron las URLs para servir la documentación de la API.
