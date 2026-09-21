# Spec Delta

## MODIFIED Requirements

### Requirement: Docker stubs directory
The repository SHALL include a `docker/` directory with `Dockerfile` and `docker-compose` files for the web delivery mode. These files MUST build and run the server host together with a sidecar Ollama, including a volume for application data. They MUST NOT remain echo/TODO stubs that cannot start the binary.

#### Scenario: Docker stubs present
- **WHEN** a developer lists `docker/`
- **THEN** both a Dockerfile and a compose file exist
- **AND** the Dockerfile MUST produce an image that starts `underlator-server` rather than printing a stub message
- **AND** compose MUST declare server and ollama services plus a data volume for the server `StorageRoot`
