# Event Driven IT-OT Architecture Concept- Micro Services to calculate OEE based on incoming MQTT topics

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/schmeckm/OEE_calculator/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/schmeckm/OEE_calculator.svg)](https://github.com/schmeckm/OEE_calculator/issues)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Endpoints](#endpoints)
- [Contributing](#contributing)
- [License](#license)
- [References](#references)

## Introduction

OEE Calculator is a simple API for calculating Overall Equipment Effectiveness (OEE). This project provides an easy way to calculate OEE based on data received from MQTT topics, store the results in an InfluxDB, and serve the calculated OEE values via a RESTful API.

### Unified Namespace (UNS)

This project implements concepts from the Unified Namespace (UNS), which is a comprehensive structure for organizing data within an industrial context. For more details on UNS, you can refer to [HiveMQ's blog on implementing UNS with MQTT and Sparkplug](https://www.hivemq.com/blog/implementing-unified-namespace-uns-mqtt-sparkplug/).

## Features

- **MQTT Integration**: Subscribe to MQTT topics to receive real-time data.
- **OEE Calculation**: Calculate OEE based on received data.
- **InfluxDB Integration**: Store OEE data in InfluxDB for historical analysis.
- **RESTful API**: Serve calculated OEE values via a RESTful API.
- **Configurable Topics**: Flexible configuration for subscribing to different MQTT topics.

## Installation

To get started with the OEE Calculator, follow these steps:

1. Clone the repository:
   ```sh
   git clone https://github.com/schmeckm/OEE_calculator.git
   cd OEE_calculator


2. Install dependencies:

npm install

3.Configure the environment variables by creating a .env file in the root directory and adding the necessary variables:

   ```sh
MQTT_BROKER_URL=mqtt://broker.hivemq.com
MQTT_BROKER_PORT=1883
MQTT_USERNAME=your_mqtt_username
MQTT_PASSWORD=your_mqtt_password
TLS_KEY=null
TLS_CERT=null
TLS_CA=null
METHOD=parris
PORT=3000
LOG_RETENTION_DAYS=2
OEE_AS_PERCENT=true
INFLUXDB_URL=http://your_influxdb_url:8086
INFLUXDB_TOKEN=your_influxdb_token
INFLUXDB_ORG=your_influxdb_org
INFLUXDB_BUCKET=your_influxdb_bucket


