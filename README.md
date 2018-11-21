# Apimeter Worker

## Requirements

- Set database_url .env variable

## Building

```bash
$ bin/setup
```

## Buildig for production

```bash
$ docker build --target PRODUCTION -t apimeter/worker .
```

## Running

```bash
$ docker-compose run --rm app <execution_id>
```
