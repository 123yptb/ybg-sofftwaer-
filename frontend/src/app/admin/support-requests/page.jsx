'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, Search, Filter, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for rapid UI verification while Express backend is not running locally.
  useEffect(() => {
    setTimeout(() => {
      setTickets([
        { id: 'TKT-1002', subject: 'GL Imbalance after API import', tenant: 'YBG Software Ltd', creator: 'John Doe', status: 'Urgent', state: 'Open', date: '2 hours ago' },
        { id: 'TKT-1001', subject: 'Cannot add new supplier', tenant: 'Stark Industries', creator: 'Jane Smith', status: 'Medium', state: 'In Progress', date: '1 day ago' },
        { id: 'TKT-1000', subject: 'How do I toggle dark mode?', tenant: 'Wayne Enterprises', creator: 'Bruce W.', status: 'Low', state: 'Closed', date: '3 days ago' },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'High': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'Low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStateIcon = (state) => {
    switch(state) {
      case 'Open': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'In Progress': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'Closed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Ticket className="w-8 h-8 text-purple-400" />
            Support Inbox
          </h1>
          <p className="text-gray-400 mt-2">Manage and resolve issues submitted by tenant users.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-200 placeholder-gray-500 w-64"
            />
          </div>
          <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-xl">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-1">ID</div>
          <div className="col-span-4">Subject</div>
          <div className="col-span-2">Tenant</div>
          <div className="col-span-2">State</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-1 text-right">Age</div>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No active support tickets.</div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors cursor-pointer group">
                <div className="col-span-1 text-sm font-mono text-gray-500 group-hover:text-purple-400 transition-colors">
                  {ticket.id}
                </div>
                <div className="col-span-4">
                  <p className="text-sm font-medium text-gray-200 truncate pr-4">{ticket.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">by {ticket.creator}</p>
                </div>
                <div className="col-span-2 text-sm text-gray-400 truncate">
                  {ticket.tenant}
                </div>
                <div className="col-span-2 flex items-center gap-2 text-sm text-gray-300">
                  {getStateIcon(ticket.state)}
                  {ticket.state}
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="col-span-1 text-right text-xs text-gray-500">
                  {ticket.date}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
