# Bacnet-driver
A BACnet protocol stack written in pure typescript with RXJS and promises. BACnet is a protocol to interact with building automation devices defined by ASHRAE. Big shout out to FH1CH for making the [node-bacstack library](https://github.com/fh1ch/node-bacstack). A lot of priniciples there, are used here.

## Usage
Add Bacnet-driver to your project by:

1) Adding the .npmrc file:
```
registry=https://npm.pkg.github.com/bastiaanv
```

2) Running the following npm command:
```
npm i @bastiaanv@bacnet-driver
```

## Features
**NOTE** this library is still in pre-alpa and is not recommended in poduction usages. For those case please use the [node-bacstack library](https://github.com/fh1ch/node-bacstack).

| Service       | Receive | Excute     |
|---------------|---------|------------|
| whoIs         | No      | Yes        |
| iAm           | Yes     | No         |
| readProperty  | No      | Partly     |
| writeProperty | No      | No         |
| readMultiple  | No      | No         |
| writeMultiple | No      | No         |

readProperty: This service can only read unsigned integers, floats, booleans, strings and ObjectIndentifiers

## Documentation
The documentation is on its way. Please be patients

## License

[The GNU GPL v2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)

Copyright (c) 2020 Bastiaan Verhaar <verhaar.bastiaan@gmail.com>

**Note:** This is not an official product of the BACnet Advocacy Group. BACnet®
is a registered trademark of American Society of Heating, Refrigerating and
Air-Conditioning Engineers (ASHRAE).
