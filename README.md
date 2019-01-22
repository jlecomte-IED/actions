# actions

Inextenso Digital collection of useful utilities for interacting with GitHub Actions.

## Implement it in your project
 - Import .github/prod-deploy.workflow in your root project
 - Import .github/branch.workflow in your root project
 - Update your makefile with thoses cmd:

```
rollgrade:
	$(call check_defined, RELEASE_TAG)
	@helm upgrade --devel \
	--install --force \
	-f ./etc/deployment/k8s.yaml \
	-f ./etc/deployment/k8s_$(XEONYS_PLATFORM_ENV).yaml \
	-f ./etc/deployment/platforms/$(XEONYS_PLATFORM)/$(XEONYS_PLATFORM_ENV)/k8s.yaml \
	$(XEONYS_PLATFORM_ENV)-$(XEONYS_PLATFORM)-$(APP_NAME) \
	--namespace $(XEONYS_PLATFORM_ENV)-$(XEONYS_PLATFORM) \
	$(HELM_REPO)/ied-php-app \
	--set "app.image.tag=$(RELEASE_TAG)"

RELEASE_TAG=$(subst refs/tags/,,${GITHUB_REF})

actions-build:
	docker build . \
	-t $(APP_IMAGE_NAME):$(RELEASE_TAG) --target latest \
	--build-arg COMPOSER_AUTH

actions-push:
	docker push $(APP_IMAGE_NAME):$(RELEASE_TAG)

actions-prepare-deploy:
	@cd ./etc/deployment/k8s \
	&& bash ./kube.sh \
	&& cd ../../..

actions-deploy: actions-prepare-deploy
	$(MAKE) XEONYS_PLATFORM_ENV=prod XEONYS_PLATFORM=fr HELM_REPO="etc/deployment/k8s/charts.k8s" rollgrade

```

## Usage

Usage information for individual commands can be found in their respective directories.

## Workflows

you can check [prod-deploy.workflow](https://github.com/inextensodigital/actions/blob/master/.github/prod-deploy.workflow)
for production deployment flow (take car to add `makefile recipes` see [invoicing.app](https://github.com/inextensodigital/invoicing.app/blob/7c5f20e475e7b7a5c8b1c8f29bd6bdf1b44b8022/Makefile#L179-L208))

you can check [branch.workflow](https://github.com/inextensodigital/actions/blob/master/.github/branch.workflow)
for deleting merged branches
