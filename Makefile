#include properties.make
export

.DEFAULT_GOAL := help
.PHONY: help

.SHELLFLAGS = -ec
.ONESHELL:
#.SILENT:

## Installs all dependencies and gets most up-to-date versions
install-deps:
	cd deploy; npm install

## Installs all dependencies from the lockfile. Will not update dependencies
install-deps-ci:
	cd deploy; npm ci

test-ci: install-deps-ci
	cd deploy; npm test

clean:
	cd deploy; rm -rf node_modules/

build:
	cd deploy; npm run build

test:
	cd deploy; npm test

# Exports value to shell and is accessible in cdk app via process.env.TELEPHONE_NUMBER
TELEPHONE_NUMBER?=+12341234

deploy-to-aws: test-ci
	cd deploy; npm run cdk deploy

#bootstrap:
#	cd deploy; AWS_REGION=$$(aws configure get region) AWS_ACCOUNT=$$(aws sts get-caller-identity --query Account --output text) npm run cdk bootstrap aws://$ACCOUNT/$REGION

#deploy-iam-role-for-service-account: test-ci
#	@echo "[i6y-service-controller] deploying IRSA requirements"
#	cd deploy; AWS_REGION=$$(aws configure get region) AWS_ACCOUNT=$$(aws sts get-caller-identity --query Account --output text) npm run cdk deploy $(SVC_CTRL_CDK_STACK) -- --require-approval never


