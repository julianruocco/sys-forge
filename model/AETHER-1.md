# Aether-1

3U CubeSat bus for a coastal imaging demonstration in a 500 km sun-synchronous orbit. The model is the source of truth; diagrams, traceability, and the assembly geometry are views.

Version 0.3

This spec is generated from `model/aether-1.mbse.json`. Edit the model, then write the spec again.

## Budgets

- Rolled-up mass: **3.31 kg**
- Rolled-up power draw: **6.65 W**
- Rolled-up power supply: **7.4 W**

### Mass breakdown

| Usage | Own mass (kg) |
| --- | ---: |
| &nbsp;&nbsp;&nbsp;&nbsp;structure : Bus Structure | 0.9 |
| &nbsp;&nbsp;&nbsp;&nbsp;eps : Electrical Power | 0.22 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;battery : Battery | 0.32 |
| &nbsp;&nbsp;&nbsp;&nbsp;adcs : Attitude Determination | 0.41 |
| &nbsp;&nbsp;&nbsp;&nbsp;cdh : Command and Data | 0.28 |
| &nbsp;&nbsp;&nbsp;&nbsp;comms : Communications | 0.19 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;antenna : Monopole Antenna | 0.02 |
| &nbsp;&nbsp;&nbsp;&nbsp;payload : Coastal Imager | 0.55 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lens : Imager Lens | 0.06 |
| &nbsp;&nbsp;&nbsp;&nbsp;solarPy : Solar Array | 0.18 |
| &nbsp;&nbsp;&nbsp;&nbsp;solarNy : Solar Array | 0.18 |

## Requirements

### REQ-MIS-001 Coastal image quality

The observatory shall image coastal water at a ground sample distance of 15 m or finer from a 500 km sun-synchronous orbit.

- Priority: high
- Status: approved
- Satisfied by: Coastal Imager

### REQ-SYS-001 Wet mass

The wet mass of Aether-1 shall not exceed 4.0 kg at launch.

- Priority: high
- Status: approved
- Satisfied by: Aether-1
- Check: mass 3.31 <= 4 kg — pass

### REQ-SYS-002 Orbit-average power

Orbit-average power consumption of the bus shall not exceed 8.0 W.

- Priority: high
- Status: approved
- Satisfied by: Electrical Power
- Check: powerDraw 6.65 <= 8 W — pass

### REQ-SYS-003 Dispenser envelope

The spacecraft, in its stowed configuration, shall fit a 3U envelope of 100 mm × 100 mm × 340.5 mm. Deployed arrays are outside this check.

- Priority: high
- Status: approved
- Satisfied by: Bus Structure
- Envelope: 100×100×340 mm against 100×100×340.5 mm — pass

### REQ-SYS-004 Pointing knowledge

The bus shall provide payload pointing knowledge of 0.5° (3σ) or better during imaging.

- Priority: high
- Status: approved
- Satisfied by: Attitude Determination

### REQ-SYS-005 Downlink margin

The S-band downlink shall close at 10° elevation with at least 3 dB of link margin.

- Priority: medium
- Status: approved
- Satisfied by: Communications

### REQ-SYS-006 Radiation tolerance

The bus shall survive a total ionizing dose of 5 krad behind 1 mm of aluminum without a functional failure.

- Priority: high
- Status: draft
- Satisfied by: nobody

### REQ-PWR-001 Generation floor

The power subsystem shall provide at least 7.0 W orbit-average generation so the 8.0 W consumption limit retains margin.

- Priority: high
- Status: approved
- Satisfied by: Electrical Power

### REQ-ADC-001 Attitude estimate

The ADCS shall estimate body attitude to within 0.2° (3σ).

- Priority: high
- Status: approved
- Satisfied by: Attitude Determination

### REQ-COM-001 EIRP

The communications subsystem shall radiate at least 2 dBW EIRP at 2.4 GHz.

- Priority: medium
- Status: draft
- Satisfied by: Communications

## Interfaces

- array +Y: Solar Array.pwr_out → Electrical Power.pwr_in
- array −Y: Solar Array.pwr_out → Electrical Power.pwr_in
- Electrical Power.pwr_out → Attitude Determination.pwr_in
- Electrical Power.pwr_out → Command and Data.pwr_in
- Electrical Power.pwr_out → Communications.pwr_in
- Electrical Power.pwr_out → Coastal Imager.pwr_in
- image stream: Coastal Imager.data_out → Command and Data.data_in
