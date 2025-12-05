import { body, ValidationChain } from 'express-validator';
import { VEHICLE_STATUSES } from '../models/Vehicle';

const reservationValidator = body('reservations')
  .optional()
  .isArray()
  .withMessage('reservations must be an array')
  .bail()
  .custom((reservations) => {
    reservations.forEach((entry: any) => {
      if (!entry.start || !entry.end) {
        throw new Error('Reservation entries require start and end');
      }
      const start = new Date(entry.start);
      const end = new Date(entry.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('Reservation dates must be valid');
      }
      if (start >= end) {
        throw new Error('Reservation start must be before end');
      }
    });
    return true;
  });

export const createVehicleValidator: ValidationChain[] = [
  body('name').notEmpty().withMessage('name is required'),
  body('type').optional().isString().trim().notEmpty(),
  body('brand').optional().isString().trim(),
  body('model').optional().isString().trim(),
  body('registrationNumber').optional().isString().trim(),
  body('status').optional().isIn(VEHICLE_STATUSES),
  body('location').optional().isString().trim(),
  body('characteristics').optional().isObject(),
  reservationValidator,
  body('maintenance').optional().isObject(),
  body('maintenance.lastServiceDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('lastServiceDate must be a date'),
  body('maintenance.nextServiceDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('nextServiceDate must be a date'),
  body('insurance').optional().isObject(),
  body('insurance.expiryDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('expiryDate must be a date'),
];

export const updateVehicleValidator: ValidationChain[] = [
  body('name').optional().notEmpty(),
  body('type').optional().isString().trim().notEmpty(),
  body('brand').optional().isString().trim(),
  body('model').optional().isString().trim(),
  body('registrationNumber').optional().isString().trim(),
  body('status').optional().isIn(VEHICLE_STATUSES),
  body('location').optional().isString().trim(),
  body('characteristics').optional().isObject(),
  reservationValidator,
  body('maintenance').optional().isObject(),
  body('maintenance.lastServiceDate').optional().isISO8601().toDate(),
  body('maintenance.nextServiceDate').optional().isISO8601().toDate(),
  body('insurance').optional().isObject(),
  body('insurance.expiryDate').optional().isISO8601().toDate(),
];
