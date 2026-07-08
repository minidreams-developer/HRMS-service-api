const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const seriesConfiguration = require('../services/seriesConfiguration.service');


const createSeriesConfiguration = catchAsync(async(req,res)=>
{
    const data = await seriesConfiguration.createSeriesConfiguration(req.body);
    res.status(httpStatus.CREATED).send(data);
});

const getAllSeriesConfiguration = catchAsync(async(req,res)=>
{
    const filter = pick(req.query, ['seriesName', 'voucherType']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await seriesConfiguration.getAllSeriesConfiguration(filter, options);
    res.send(result);
});

module.exports = 
{
    createSeriesConfiguration,
    getAllSeriesConfiguration,
}