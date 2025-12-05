import { body, ValidationChain } from 'express-validator';
import {
  VEHICLE_STATUSES,
  VehicleComplianceDocument,
} from '../models/Vehicle';
import { VEHICLE_USAGE_TYPES } from '../config/permissions';

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

const complianceDocumentValidator = body('complianceDocuments')
  .optional()
  .isArray()
  .withMessage('complianceDocuments must be an array')
  .bail()
  .custom((documents: VehicleComplianceDocument[]) => {
    documents.forEach((doc) => {
      if (!doc.title) {
        throw new Error('Each compliance document must include a title');
      }
      if (doc.type && !['insurance', 'technicalInspection', 'other'].includes(doc.type)) {
        throw new Error('Invalid compliance document type');
      }
      if (doc.url && typeof doc.url !== 'string') {
        throw new Error('compliance document url must be a string');
      }
      if (doc.uploadedAt && Number.isNaN(new Date(doc.uploadedAt).getTime())) {
        throw new Error('compliance document uploadedAt must be a date');
      }
      if (doc.expiresAt && Number.isNaN(new Date(doc.expiresAt).getTime())) {
        throw new Error('compliance document expiresAt must be a date');
      }
    });
    return true;
  });

export const createVehicleValidator: ValidationChain[] = [
  body('name').notEmpty().withMessage('name is required'),
  body('type').optional().isString().trim().notEmpty(),
  body('usage').optional().isIn(VEHICLE_USAGE_TYPES),
  body('structure').optional().isMongoId(),
  body('brand').optional().isString().trim(),
  body('model').optional().isString().trim(),
  body('registrationNumber').optional().isString().trim(),
  body('status').optional().isIn(VEHICLE_STATUSES),
  body('location').optional().isString().trim(),
  body('characteristics').optional().isObject(),
  complianceDocumentValidator,
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
  body('technicalInspection').optional().isObject(),
  body('technicalInspection.lastInspectionDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('lastInspectionDate must be a date'),
  body('technicalInspection.expiryDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('technical inspection expiryDate must be a date'),
  body('kilometersTraveled').optional().isFloat({ min: 0 }),
  body('downtimeDays').optional().isFloat({ min: 0 }),
];

export const updateVehicleValidator: ValidationChain[] = [
  body('name').optional().notEmpty(),
  body('type').optional().isString().trim().notEmpty(),
  body('usage').optional().isIn(VEHICLE_USAGE_TYPES),
  body('structure').optional().isMongoId(),
  body('brand').optional().isString().trim(),
  body('model').optional().isString().trim(),
  body('registrationNumber').optional().isString().trim(),
  body('status').optional().isIn(VEHICLE_STATUSES),
  body('location').optional().isString().trim(),
  body('characteristics').optional().isObject(),
  complianceDocumentValidator,
  reservationValidator,
  body('maintenance').optional().isObject(),
  body('maintenance.lastServiceDate').optional().isISO8601().toDate(),
  body('maintenance.nextServiceDate').optional().isISO8601().toDate(),
  body('insurance').optional().isObject(),
  body('insurance.expiryDate').optional().isISO8601().toDate(),
  body('technicalInspection').optional().isObject(),
  body('technicalInspection.lastInspectionDate').optional().isISO8601().toDate(),
  body('technicalInspection.expiryDate').optional().isISO8601().toDate(),
  body('kilometersTraveled').optional().isFloat({ min: 0 }),
  body('downtimeDays').optional().isFloat({ min: 0 }),
];
