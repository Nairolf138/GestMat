import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { api } from './api';
import { GlobalContext } from './GlobalContext';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { addToCart as addCartItem } from './Cart.jsx';
import Loading from './Loading.jsx';
import { useSearchParams } from 'react-router-dom';

const HIDDEN_STATUSES = ['HS', 'En maintenance'];

const filterUnavailableItems = (data) =>
  data.filter((item) => !HIDDEN_STATUSES.includes(item.status));

function Catalog() {
  const { t } = useTranslation();
  const { structures } = useContext(GlobalContext);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: initialSearch,
    type: '',
    structure: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addAnimation, setAddAnimation] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const addAnimationTimeoutRef = useRef(null);
  const PAGE_SIZE = 20;
  const isInvalidPeriod =
    filters.startDate && filters.endDate && filters.startDate > filters.endDate;

  const fetchItems = useCallback(
    (targetPage) => {
      const isFirstPage = targetPage === 1;
      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const params = new URLSearchParams({
        search: filters.search,
        type: filters.type,
        structure: filters.structure,
        catalog: 'true',
        all: 'true',
        limit: PAGE_SIZE.toString(),
        page: targetPage.toString(),
      });
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      api(`/equipments?${params.toString()}`)
        .then((data) => {
          const filteredData = filterUnavailableItems(data);
          setItems((prev) =>
            isFirstPage ? filteredData : [...prev, ...filteredData],
          );
          const moreAvailable = data.length === PAGE_SIZE;
          setHasMore(moreAvailable);
        })
        .catch(() => {
          if (isFirstPage) {
            setItems([]);
          }
        })
        .finally(() => {
          if (isFirstPage) {
            setLoading(false);
          } else {
            setLoadingMore(false);
          }
        });
    },
    [filters.endDate, filters.search, filters.startDate, filters.structure, filters.type],
  );

  useEffect(() => {
    setItems([]);
    setHasMore(true);
    setPage(1);
  }, [filters.endDate, filters.search, filters.startDate, filters.structure, filters.type]);

  useEffect(() => {
    fetchItems(page);
  }, [page, filters.endDate, filters.search, filters.startDate, filters.structure, filters.type, fetchItems]);

  useEffect(() => {
    setQuantities((prev) => {
      let updated = prev;

      items.forEach((item) => {
        if (prev[item._id] === undefined) {
          if (updated === prev) {
            updated = { ...prev };
          }

          updated[item._id] = '1';
        }
      });

      return updated;
    });
  }, [items]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (addAnimationTimeoutRef.current) {
        clearTimeout(addAnimationTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    setPage((prev) => prev + 1);
  }, [hasMore, loading, loadingMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
      observer.disconnect();
    };
  }, [handleLoadMore, hasMore, loading]);

  const handleQtyChange = (id, value) => {
    setQuantities({ ...quantities, [id]: value });
  };

  const clearAddAnimation = useCallback(() => {
    if (addAnimationTimeoutRef.current) {
      clearTimeout(addAnimationTimeoutRef.current);
      addAnimationTimeoutRef.current = null;
    }
    setAddAnimation(null);
  }, []);

  const triggerAddAnimation = useCallback(
    (itemName) => {
      clearAddAnimation();
      setAddAnimation({ itemName });
      addAnimationTimeoutRef.current = setTimeout(() => {
        setAddAnimation(null);
        addAnimationTimeoutRef.current = null;
      }, 1700);
    },
    [clearAddAnimation],
  );

  const addToCart = async (eq) => {
    const qtyValue = quantities[eq._id];
    const qty = Number(qtyValue === '' || qtyValue === undefined ? 1 : qtyValue);
    if (Number.isNaN(qty) || qty < 1) return;
    if (!filters.startDate || !filters.endDate) {
      setError(t('catalog.select_period'));
      setSuccess('');
      return;
    }
    if (isInvalidPeriod) {
      setError(t('catalog.invalid_period'));
      setSuccess('');
      return;
    }
    try {
      const res = await api(
        `/equipments/${eq._id}/availability?start=${filters.startDate}&end=${filters.endDate}&quantity=${qty}`,
      );
      if (!res.available) {
        setError(t('catalog.unavailable'));
        setSuccess('');
        clearAddAnimation();
        return;
      }
      addCartItem({
        equipment: eq,
        quantity: qty,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setError('');
      setSuccess(t('catalog.added'));
      triggerAddAnimation(eq.name);
    } catch (err) {
      setError(err.message || t('catalog.error'));
      setSuccess('');
      clearAddAnimation();
    }
  };

  return (
    <>
      <h1 className="h1">{t('catalog.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={success} />
      {addAnimation && (
        <div
          className="add-toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="add-toast__icon" aria-hidden="true">
            ✓
          </span>
          <div className="add-toast__content">
            <p className="add-toast__title">{t('catalog.added')}</p>
            <p className="add-toast__subtitle">{addAnimation.itemName}</p>
          </div>
        </div>
      )}
      <div
        className="row"
        style={{
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
          <div className="col-md">
            <input
              name="search"
              placeholder={t('catalog.search')}
              className="form-control"
              value={filters.search}
              onChange={handleChange}
            />
          </div>
          <div className="col-md">
            <select
              name="type"
              className="form-select"
              value={filters.type}
              onChange={handleChange}
            >
              <option value="">{t('catalog.all_types')}</option>
              <option value="Son">{t('equipments.add.types.sound')}</option>
              <option value="Lumière">{t('equipments.add.types.light')}</option>
              <option value="Plateau">{t('equipments.add.types.stage')}</option>
              <option value="Vidéo">{t('equipments.add.types.video')}</option>
              <option value="Autre">{t('equipments.add.types.other')}</option>
            </select>
          </div>
          <div className="col-md">
            <select
              name="structure"
              className="form-select"
              value={filters.structure}
              onChange={handleChange}
            >
              <option value="">{t('catalog.all_structures')}</option>
              {structures.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md">
            <input
              name="startDate"
              type="date"
              className="form-control"
              value={filters.startDate}
              onChange={handleChange}
            />
          </div>
          <div className="col-md">
            <input
              name="endDate"
              type="date"
              className="form-control"
              value={filters.endDate}
              onChange={handleChange}
            />
          </div>
        </div>
        {isMobile ? (
          <div
            className="card-grid"
            style={{ marginBottom: 'var(--spacing-xxl)' }}
          >
            {loading ? (
              <Loading />
            ) : (
              items.map((it) => (
                <div className="card" key={it._id}>
                  <div className="card-body">
                    <h5 className="card-title h5">{it.name}</h5>
                    <p className="card-text">
                      <strong>{t('catalog.type')}:</strong> {it.type}
                      <br />
                      <strong>{t('catalog.structure')}:</strong>{' '}
                      {it.structure?.name}
                      <br />
                      <strong>{t('catalog.available_total')}:</strong>{' '}
                      {it.availability}
                    </p>
                    <div className="card-actions">
                      <input
                        name={`quantity-${it._id}`}
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={quantities[it._id] ?? '1'}
                        onChange={(e) =>
                          handleQtyChange(it._id, e.target.value)
                        }
                        style={{ marginRight: 'var(--spacing-sm)' }}
                      />
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => addToCart(it)}
                      >
                        {t('catalog.add_to_cart')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('catalog.equipment')}</th>
                  <th>{t('catalog.type')}</th>
                  <th>{t('catalog.structure')}</th>
                  <th>{t('catalog.available_total')}</th>
                  <th>{t('catalog.quantity')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6">
                      <Loading />
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it._id}>
                      <td>{it.name}</td>
                      <td>{it.type}</td>
                      <td>{it.structure?.name}</td>
                      <td>{it.availability}</td>
                      <td>
                        <input
                          name={`quantity-${it._id}`}
                          type="number"
                          min="1"
                          className="form-control form-control-sm"
                          value={quantities[it._id] ?? '1'}
                          onChange={(e) =>
                            handleQtyChange(it._id, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => addToCart(it)}
                        >
                          {t('catalog.add_to_cart')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {loadingMore && (
          <div className="text-center" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <Loading />
          </div>
        )}
        {hasMore && !loading && (
          <div
            ref={sentinelRef}
            style={{ height: '1px', marginBottom: 'var(--spacing-lg)' }}
            aria-hidden="true"
          />
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-center text-muted" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {t('catalog.end_of_list') || '—'}
          </p>
        )}
    </>
  );
}

export default Catalog;
