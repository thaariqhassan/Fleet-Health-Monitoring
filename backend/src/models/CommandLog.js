const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Device = require('./Device');

const CommandLog = sequelize.define('CommandLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  deviceId: { type: DataTypes.UUID, allowNull: false },
  command: { type: DataTypes.ENUM('lock', 'unlock', 'wipe', 'message', 'restart'), allowNull: false },
  payload: { type: DataTypes.STRING, allowNull: true },
  issuedBy: { type: DataTypes.STRING, defaultValue: 'admin' },
}, { timestamps: true });

Device.hasMany(CommandLog, { foreignKey: 'deviceId' });
CommandLog.belongsTo(Device, { foreignKey: 'deviceId' });

module.exports = CommandLog;