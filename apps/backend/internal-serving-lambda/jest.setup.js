// Nx loads the root .env into tests, and these turn on local-dev behavior.
delete process.env.DEV_USER_ID;
delete process.env.LOCAL_UPLOAD_DIR;
