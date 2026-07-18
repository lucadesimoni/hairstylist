/*!
 * Hairlist API client — a dependency-free wrapper for exchanging data with a
 * hairlist.ch / Belbo salon's API. Reads salon data (services, staff, opening
 * hours, availability) and writes bookings and customer accounts.
 *
 * The hairlist API is enabled per salon under Settings > API Access and is
 * authenticated with that salon's API key. Because every hairlist installation
 * can expose slightly different paths/field names, ALL endpoint paths and the
 * response field mappings are configurable — point them at the values from your
 * salon's official API docs. Sensible REST defaults are provided.
 *
 *   var api = HairlistApi.create({
 *     shop: 'steiner',                     // -> https://steiner.hairlist.ch/api
 *     apiKey: 'YOUR_SALON_API_KEY',
 *     onExchange: function (e) { console.log(e.method, e.path, e.status); }
 *   });
 *   api.getServices().then(render);
 *   api.createBooking({ serviceId, staffId, start, customer }).then(...);
 *
 * A `transport` can be injected to run the same code against a mock or proxy.
 * License: MIT
 */
(function (global) {
  'use strict';

  var DEFAULT_ENDPOINTS = {
    salon:        '/salon',            // GET  salon profile + opening hours
    services:     '/services',         // GET  bookable services
    staff:        '/staff',            // GET  stylists / calendars
    availability: '/availability',     // GET  free slots for a service/staff/date range
    bookings:     '/bookings',         // POST create an appointment
    customers:    '/customers',        // POST register a customer
    login:        '/customers/login'   // POST authenticate a customer
  };

  // Field mappers: read a value from an API object regardless of exact naming.
  function pick(obj, keys, dflt) {
    for (var i = 0; i < keys.length; i++) {
      if (obj && obj[keys[i]] != null) return obj[keys[i]];
    }
    return dflt;
  }

  function create(opts) {
    opts = opts || {};
    var shop = opts.shop || null;
    var baseUrl = (opts.baseUrl ||
      (shop ? 'https://' + (/\./.test(shop) ? shop : shop + '.hairlist.ch') + '/api' : ''))
      .replace(/\/+$/, '');
    var apiKey = opts.apiKey || null;
    var authScheme = opts.authScheme || 'bearer';      // 'bearer' | 'header' | 'query'
    var authHeaderName = opts.authHeaderName || 'X-Api-Key';
    var keyParam = opts.keyParam || 'api_key';
    var lang = opts.lang || null;
    var endpoints = Object.assign({}, DEFAULT_ENDPOINTS, opts.endpoints || {});
    var transport = opts.transport || null;             // (method,url,{headers,body}) => Promise<{status,json,text}>
    var onExchange = opts.onExchange || null;
    var timeoutMs = opts.timeoutMs || 15000;

    function buildUrl(path, query) {
      var url = baseUrl + path;
      var q = Object.assign({}, query || {});
      if (apiKey && authScheme === 'query') q[keyParam] = apiKey;
      if (lang) q.lang = lang;
      var pairs = Object.keys(q).filter(function (k) { return q[k] != null; })
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]); });
      return pairs.length ? url + (url.indexOf('?') === -1 ? '?' : '&') + pairs.join('&') : url;
    }

    function headers(hasBody) {
      var h = { 'Accept': 'application/json' };
      if (hasBody) h['Content-Type'] = 'application/json';
      if (apiKey && authScheme === 'bearer') h['Authorization'] = 'Bearer ' + apiKey;
      if (apiKey && authScheme === 'header') h[authHeaderName] = apiKey;
      return h;
    }

    function withTimeout(promise) {
      if (typeof AbortController === 'undefined') return promise();
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
      return promise(ctrl.signal).then(
        function (v) { clearTimeout(timer); return v; },
        function (e) { clearTimeout(timer); throw e; }
      );
    }

    function request(method, path, opts2) {
      opts2 = opts2 || {};
      var url = buildUrl(path, opts2.query);
      var body = opts2.body;
      var reqHeaders = headers(!!body);
      var started = (typeof performance !== 'undefined' ? performance.now() : Date.now());

      function emit(status, resBody, error) {
        if (!onExchange) return;
        try {
          onExchange({
            method: method, path: path, url: url,
            reqBody: body || null, status: status, resBody: resBody != null ? resBody : null,
            error: error || null,
            ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started)
          });
        } catch (e) {}
      }

      var run;
      if (transport) {
        run = Promise.resolve(transport(method, url, { headers: reqHeaders, body: body || null, path: path }));
      } else {
        run = withTimeout(function (signal) {
          return fetch(url, {
            method: method, headers: reqHeaders, credentials: 'omit', signal: signal,
            body: body ? JSON.stringify(body) : undefined
          }).then(function (r) {
            return r.text().then(function (t) {
              var json = null; try { json = t ? JSON.parse(t) : null; } catch (e) {}
              return { status: r.status, json: json, text: t };
            });
          });
        });
      }

      return run.then(function (res) {
        var status = res.status != null ? res.status : 0;
        var data = res.json != null ? res.json : res.data;
        emit(status, data);
        if (status < 200 || status >= 300) {
          var err = new Error('Hairlist API ' + method + ' ' + path + ' failed (' + status + ')');
          err.status = status; err.body = data;
          throw err;
        }
        return data;
      }, function (e) {
        emit(0, null, e && e.message ? e.message : String(e));
        throw e;
      });
    }

    // Unwrap common list envelopes ({data:[...]} / {items:[...]} / [...]).
    function list(data, keys) {
      if (Array.isArray(data)) return data;
      var v = pick(data, keys || ['data', 'items', 'results'], null);
      return Array.isArray(v) ? v : [];
    }

    var m = opts.map || {};

    // ---- Reads ------------------------------------------------------------
    function getSalon() {
      return request('GET', endpoints.salon).then(function (d) {
        var s = (d && d.data) ? d.data : d || {};
        return {
          name: pick(s, m.name || ['name', 'title']),
          tagline: pick(s, m.tagline || ['tagline', 'slogan', 'description']),
          currency: pick(s, m.currency || ['currency'], 'CHF'),
          phone: pick(s, m.phone || ['phone', 'telephone']),
          email: pick(s, m.email || ['email']),
          website: pick(s, m.website || ['website', 'url']),
          address: pick(s, m.address || ['address'], null),
          hours: pick(s, m.hours || ['hours', 'opening_hours', 'openingHours'], null),
          raw: s
        };
      });
    }

    function getServices() {
      return request('GET', endpoints.services).then(function (d) {
        return list(d).map(function (s) {
          return {
            id: pick(s, m.serviceId || ['id', 'service_id', 'uuid']),
            name: pick(s, m.serviceName || ['name', 'title']),
            category: pick(s, m.category || ['category', 'group', 'category_name'], ''),
            price: pick(s, m.price || ['price', 'amount', 'cost']),
            currency: pick(s, m.currency || ['currency'], 'CHF'),
            duration: pick(s, m.duration || ['duration', 'duration_minutes', 'minutes']),
            priceFrom: !!pick(s, m.priceFrom || ['price_from', 'from'], false),
            raw: s
          };
        });
      });
    }

    function getStaff() {
      return request('GET', endpoints.staff).then(function (d) {
        return list(d).map(function (s) {
          return {
            id: pick(s, m.staffId || ['id', 'staff_id', 'calendar_id', 'uuid']),
            name: pick(s, m.staffName || ['name', 'display_name', 'title']),
            role: pick(s, m.role || ['role', 'position', 'job_title'], ''),
            photo: pick(s, m.photo || ['photo', 'image', 'avatar'], null),
            raw: s
          };
        });
      });
    }

    // params: { serviceId, staffId, from (ISO date), to (ISO date) }
    function getAvailability(params) {
      params = params || {};
      var q = {};
      q[m.qService || 'service_id'] = params.serviceId;
      q[m.qStaff || 'staff_id'] = params.staffId && params.staffId !== 'any' ? params.staffId : undefined;
      q[m.qFrom || 'from'] = params.from;
      q[m.qTo || 'to'] = params.to;
      return request('GET', endpoints.availability, { query: q }).then(function (d) {
        // Accept either grouped ({date, slots:[{time,available}]}) or flat ([{start,available}]).
        var arr = list(d, ['data', 'availability', 'days', 'slots']);
        return arr.map(function (row) {
          if (row.slots || row.times) {
            return {
              date: pick(row, ['date', 'day']),
              closed: !!pick(row, ['closed', 'is_closed'], false),
              slots: (row.slots || row.times).map(function (t) {
                return {
                  time: pick(t, m.slotTime || ['time', 'start', 'from']),
                  free: pick(t, m.slotFree || ['available', 'free', 'is_free'], true)
                };
              })
            };
          }
          return {
            start: pick(row, m.slotStart || ['start', 'datetime', 'time']),
            free: pick(row, m.slotFree || ['available', 'free'], true)
          };
        });
      });
    }

    // ---- Writes -----------------------------------------------------------
    // booking: { serviceId, staffId, start (ISO datetime), customer:{name,email,phone,notes} }
    function createBooking(booking) {
      booking = booking || {};
      var payload = {};
      payload[m.bService || 'service_id'] = booking.serviceId;
      payload[m.bStaff || 'staff_id'] = booking.staffId && booking.staffId !== 'any' ? booking.staffId : null;
      payload[m.bStart || 'start'] = booking.start;
      payload[m.bCustomer || 'customer'] = booking.customer || {};
      if (booking.customerId) payload[m.bCustomerId || 'customer_id'] = booking.customerId;
      if (booking.notes) payload[m.bNotes || 'notes'] = booking.notes;
      return request('POST', endpoints.bookings, { body: payload }).then(function (d) {
        var b = (d && d.data) ? d.data : d || {};
        return {
          id: pick(b, m.bookingId || ['id', 'booking_id', 'uuid']),
          reference: pick(b, m.bookingRef || ['reference', 'ref', 'code', 'confirmation']),
          status: pick(b, m.bookingStatus || ['status', 'state'], 'requested'),
          raw: b
        };
      });
    }

    // customer: { name, email, phone, password }
    function registerCustomer(customer) {
      customer = customer || {};
      var payload = {};
      payload[m.cName || 'name'] = customer.name;
      payload[m.cEmail || 'email'] = customer.email;
      payload[m.cPhone || 'phone'] = customer.phone;
      payload[m.cPassword || 'password'] = customer.password;
      return request('POST', endpoints.customers, { body: payload }).then(function (d) {
        var c = (d && d.data) ? d.data : d || {};
        return {
          id: pick(c, m.customerId || ['id', 'customer_id', 'uuid']),
          name: pick(c, ['name', 'display_name'], customer.name),
          email: pick(c, ['email'], customer.email),
          token: pick(c, m.token || ['token', 'access_token', 'jwt'], null),
          raw: c
        };
      });
    }

    // credentials: { email, password }
    function loginCustomer(credentials) {
      credentials = credentials || {};
      var payload = {};
      payload[m.cEmail || 'email'] = credentials.email;
      payload[m.cPassword || 'password'] = credentials.password;
      return request('POST', endpoints.login, { body: payload }).then(function (d) {
        var c = (d && d.data) ? d.data : d || {};
        var cust = c.customer || c;
        return {
          id: pick(cust, ['id', 'customer_id', 'uuid']),
          name: pick(cust, ['name', 'display_name']),
          email: pick(cust, ['email'], credentials.email),
          phone: pick(cust, ['phone'], ''),
          token: pick(c, m.token || ['token', 'access_token', 'jwt'], null),
          raw: c
        };
      });
    }

    return {
      config: { shop: shop, baseUrl: baseUrl, endpoints: endpoints, authScheme: authScheme, hasKey: !!apiKey },
      getSalon: getSalon,
      getServices: getServices,
      getStaff: getStaff,
      getAvailability: getAvailability,
      createBooking: createBooking,
      registerCustomer: registerCustomer,
      loginCustomer: loginCustomer,
      request: request
    };
  }

  if (typeof Object.assign !== 'function') {
    Object.assign = function (t) {
      for (var i = 1; i < arguments.length; i++) { var s = arguments[i];
        if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; }
      return t;
    };
  }

  var HairlistApi = { create: create, DEFAULT_ENDPOINTS: DEFAULT_ENDPOINTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = HairlistApi;
  global.HairlistApi = HairlistApi;

})(typeof window !== 'undefined' ? window : this);
