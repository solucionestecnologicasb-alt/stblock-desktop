// generado por STB academy
void setup() {
  Serial.begin(9600);
  Serial.begin(9600);
}

void loop() {
  Serial.println(readUltrasonicDistance(6, 7));
  delay((2 * 1000));
}

float readUltrasonicDistance(int triggerPin, int echoPin) {
  pinMode(triggerPin, OUTPUT);
  digitalWrite(triggerPin, LOW);
  delayMicroseconds(2);
  digitalWrite(triggerPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(triggerPin, LOW);
  pinMode(echoPin, INPUT);
  return pulseIn(echoPin, HIGH) * 0.01723;
}
