.PHONY: dev build clean install preview typecheck

install:
	bun install

dev: install
	bun run vite --port 5174

build:
	bun run vite build

preview:
	bun run vite preview --port 5174

typecheck:
	bun run tsc --noEmit

clean:
	rm -rf dist node_modules
