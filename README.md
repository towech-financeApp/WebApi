# WebApi

![License: BSD-3-Clause](https://img.shields.io/github/license/towech-financeApp/WebApi)

Http API for the app intended to serve the WebClient, it exists only to have an intermediary between the user and the amqp queues.

# Table of Contents
1. [Installation](#Installation)
2. [Environment](#Environment)
3. [Future improvements](#Future_Improvements)
4. [Credits](#Credits)

## Installation

### Local instalation
To run this api on local, node and npm are needed. This repository uses a git 
[submodel](https://github.com/towech-financeApp/Models), so them need to be downloaded 
as well: 

> git clone --recurse-submodules -j8 git://github.com/towech-financeApp/UserService.git

If the repo was already cloned, then use the command inside the folder:
> git submodule update --init --recursive

The install the dependencies from the package-lock file using the command:
> npm ci

To run the dev server:
> npm run dev

### Docker
To run this worker on a docker container, first it needs to be built:

For development
> docker build towechFinance-WebApi . --target dev

For production
> docker build towechFinance-WebApi . --target prod

### Heroku
The repository also has the capabilty to be deployed with heroku. Don't forget to add 
the recursive git submodules to the builpacks.

## Environment
The repository has an [example environment](/env.sample) which contains all the 
necessary env variables for this service to work.


## Credits
- Jose Tow [[@Tow96](https://github.com/Tow96)]
