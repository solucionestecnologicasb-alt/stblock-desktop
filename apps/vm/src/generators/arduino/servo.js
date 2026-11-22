/**
 * Arduino Servo Block Generators
 * Servo motor control
 */

module.exports = {
    // Servo write angle
    arduino_servoWrite (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const angle = this.generateValue(block, 'ANGLE', blocks);

        // Add Servo library and setup
        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        return `${servoName}.write(${angle});\n`;
    },

    // Servo read angle
    arduino_servoRead (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        return `${servoName}.read()`;
    },

    // Servo attach
    arduino_servoAttach (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');

        return `${servoName}.attach(${pin});\n`;
    },

    // Servo detach
    arduino_servoDetach (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const servoName = `servo_${pin}`;
        return `${servoName}.detach();\n`;
    },

    // Servo write microseconds
    arduino_servoWriteMicroseconds (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const us = this.generateValue(block, 'MICROSECONDS', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        return `${servoName}.writeMicroseconds(${us});\n`;
    },

    // Set servo to position (simplified)
    arduino_setServo (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const position = this.generateValue(block, 'POSITION', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        return `${servoName}.write(${position});\n`;
    },

    // Continuous servo
    arduino_continuousServo (block, blocks) {
        const pin = this.generateValue(block, 'PIN', blocks);
        const speed = this.generateValue(block, 'SPEED', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        // Speed: -100 to 100 mapped to 0-180
        return `${servoName}.write(map(${speed}, -100, 100, 0, 180));\n`;
    },

    // ============================================
    // STBoard style servo blocks
    // ============================================

    // Attach servo (STBoard style)
    attachServo (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const minUs = this.generateValue(block, 'MIN_US', blocks) || '544';
        const maxUs = this.generateValue(block, 'MAX_US', blocks) || '2400';

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');

        return `${servoName}.attach(${pin}, ${minUs}, ${maxUs});\n`;
    },

    // Detach servo (STBoard style)
    detachServo (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const servoName = `servo_${pin}`;
        return `${servoName}.detach();\n`;
    },

    // Set servo output angle (STBoard style)
    setServoOutput (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const angle = this.generateValue(block, 'OUT', blocks) || '90';

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        return `${servoName}.write(${angle});\n`;
    },

    // Set servo pulse output (STBoard style)
    setServoPulseOutput (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const pulse = this.generateValue(block, 'OUT', blocks) || '1500';

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        return `${servoName}.writeMicroseconds(${pulse});\n`;
    },

    // Center servo (STBoard style)
    centerServo (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        return `${servoName}.write(90);\n`;
    },

    // Move servo smooth (STBoard style)
    moveServoSmooth (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const angle = this.generateValue(block, 'OUT', blocks) || '90';
        const time = this.generateValue(block, 'TIME', blocks) || '1000';

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        // Generate smooth movement code
        return `// Mover servo suavemente a ${angle} grados en ${time}ms
{
    int startAngle = ${servoName}.read();
    int targetAngle = ${angle};
    int duration = ${time};
    int steps = abs(targetAngle - startAngle);
    if (steps > 0) {
        int stepDelay = duration / steps;
        for (int i = 0; i <= steps; i++) {
            ${servoName}.write(startAngle + (targetAngle - startAngle) * i / steps);
            delay(stepDelay);
        }
    }
}\n`;
    },

    // Set continuous servo speed (STBoard style)
    setContinuousServoSpeed (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const speed = this.generateValue(block, 'OUT', blocks) || '0';

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        // Speed: -100 to 100 mapped to 0-180
        return `${servoName}.write(map(${speed}, -100, 100, 0, 180));\n`;
    },

    // Stop continuous servo (STBoard style)
    stopContinuousServo (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');
        this.addSetupCode(`${servoName}.attach(${pin});`);

        return `${servoName}.write(90);\n`;
    },

    // Is servo attached (STBoard style)
    isServoAttached (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);
        const servoName = `servo_${pin}`;
        return `${servoName}.attached()`;
    },

    // Read servo angle (STBoard style)
    readServoAngle (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');

        return `${servoName}.read()`;
    },

    // Read servo pulse (STBoard style)
    readServoPulse (block, blocks) {
        const pin = this.getFieldValue(block, 'PIN') || this.generateValue(block, 'PIN', blocks);

        this.addInclude('Servo.h');
        const servoName = `servo_${pin}`;
        this.addGlobalVar(servoName, 'Servo');

        return `${servoName}.readMicroseconds()`;
    }
};
