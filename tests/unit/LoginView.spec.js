import { shallowMount, createLocalVue } from '@vue/test-utils'
import LoginView from '@/views/auth/LoginView.vue'
import Vuex from 'vuex'
import ElementUI from 'element-ui'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(ElementUI)

describe('LoginView.vue', () => {
  let actions
  let store

  beforeEach(() => {
    actions = {
      login: jest.fn()
    }
    store = new Vuex.Store({
      actions
    })
  })

  it('renders login form properly', () => {
    const wrapper = shallowMount(LoginView, { store, localVue })
    // Check if the component mounts successfully
    expect(wrapper.exists()).toBe(true)
  })
})
