const httpStatus = require('http-status');
const seriesConfiguration = require('../models/seriesConfiguration.model');
const ApiError = require('../utils/ApiError');

const createSeriesConfiguration = async(userBody)=>
{
    const data = await seriesConfiguration.create(userBody);
    return data;
}

const getAllSeriesConfiguration = async(filter,options)=>
{
    const result = await seriesConfiguration.paginate(filter,options);
    return result;
}
module.exports = 
{
    createSeriesConfiguration,
    getAllSeriesConfiguration,
}