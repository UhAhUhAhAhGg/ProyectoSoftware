"use client"
import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const MonthlyIncomeChart = ({ data = [] }) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="income" stroke="#8884d8" name="Ingresos" />
          <Line type="monotone" dataKey="net_income" stroke="#82ca9d" name="Neto" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MonthlyIncomeChart
