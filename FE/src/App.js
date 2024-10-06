import { Route, Routes } from 'react-router-dom';
import routeList from './router';
import './App.css';
import ToastCustom from './components/ToastCustom';
import { useEffect } from 'react';
import Aos from 'aos';
import 'aos/dist/aos.css';
function App() {
  useEffect(() => {
    Aos.init({
      duration: 2500,
      delay: 400,
    });
  }
  );

  const handleRouteChild = (routeChildren) => {
    return routeChildren.map(item => (
      <Route path={item.path} element={item.element} key={item.path}>
        {
          item.children && handleRouteChild(item.children)
        }
      </Route>
    ))
  }

  return (
    <div className='font-normal'>
      <ToastCustom />
      <Routes>
        {
          routeList.map(item => (
            <Route path={item.path} element={item.element} key={item.path}>
              {
                item.children && handleRouteChild(item.children)
              }
            </Route>
          ))
        }
      </Routes>
    </div>
  );
}

export default App;
