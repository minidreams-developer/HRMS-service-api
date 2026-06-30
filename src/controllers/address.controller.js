const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { addressService } = require('../services');

const createAddress = catchAsync(async (req, res) => {
  const address = await addressService.createAddress(req.body);
  res.status(httpStatus.CREATED).send(address);
});

const getAddresses = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['city', 'state', 'pincode']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await addressService.queryAddresses(filter, options);
  res.send(result);
});

const getAddress = catchAsync(async (req, res) => {
  const address = await addressService.getAddressById(req.params.addressId);
  if (!address) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Address not found');
  }
  res.send(address);
});

const updateAddress = catchAsync(async (req, res) => {
  const address = await addressService.updateAddressById(req.params.addressId, req.body);
  res.send(address);
});

const deleteAddress = catchAsync(async (req, res) => {
  await addressService.deleteAddressById(req.params.addressId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createAddress,
  getAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
};
